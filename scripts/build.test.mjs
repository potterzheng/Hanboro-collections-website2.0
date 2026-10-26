import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareCatalog, publishedCatalog, readCatalog } from './site-assets.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const temporary = path.join(root, '.test-tmp');
fs.mkdirSync(temporary, { recursive: true });
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function fixture(run) {
  const directory = fs.mkdtempSync(path.join(temporary, 'build-'));
  try {
    fs.mkdirSync(path.join(directory, 'scripts'), { recursive: true });
    for (const name of ['build.mjs', 'site-assets.mjs']) fs.copyFileSync(path.join(root, 'scripts', name), path.join(directory, 'scripts', name));
    fs.mkdirSync(path.join(directory, 'src'));
    for (const name of ['icons.json', 'catalog.css', 'catalog.js', 'online.js', 'catalog.template.html', 'purchase-state.js', 'inquiry-document.js']) fs.copyFileSync(path.join(root, 'src', name), path.join(directory, 'src', name));
    fs.mkdirSync(path.join(directory, 'data'));
    fs.mkdirSync(path.join(directory, 'dist/web-images/test'), { recursive: true });
    const main = { role: 'main', url: 'web-images/test/main-12345678901234-aaaaaaaaaaaa.webp', thumb: 'web-images/test/thumb-12345678901234-bbbbbbbbbbbb.webp' };
    const product = { images: { main, gallery: [], overview: [] }, variants: [] };
    const catalog = { models: [{ images: { main }, products: [product] }] };
    fs.writeFileSync(path.join(directory, 'data/catalog.json'), JSON.stringify(catalog));
    fs.writeFileSync(path.join(directory, 'dist/web-images/test/main-12345678901234.webp'), 'image-fixture');
    fs.writeFileSync(path.join(directory, 'dist/web-images/test/thumb-12345678901234.webp'), 'thumb-fixture');
    run(directory);
  } finally {
    const absolute = path.resolve(directory);
    assert(absolute.startsWith(temporary + path.sep));
    assert(!fs.lstatSync(absolute).isSymbolicLink());
    fs.rmSync(absolute, { recursive: true });
  }
}

test('existing dist filenames are resolved without modifying source data', () => fixture(directory => {
  const source = path.join(directory, 'data/catalog.json');
  const before = digest(source);
  const { catalog, remapped } = prepareCatalog(directory);
  assert.equal(remapped, 2);
  assert.equal(catalog.models[0].images.main.url, 'web-images/test/main-12345678901234.webp');
  assert.equal(digest(source), before);
}));

test('missing images fail before the existing page or photos are changed', () => fixture(directory => {
  const source = path.join(directory, 'data/catalog.json');
  const catalog = JSON.parse(fs.readFileSync(source, 'utf8'));
  catalog.models[0].products[0].images.main.url = 'web-images/test/absent.webp';
  fs.writeFileSync(source, JSON.stringify(catalog));
  const index = path.join(directory, 'dist/index.html');
  fs.writeFileSync(index, 'previous-page');
  assert.throws(() => execFileSync(process.execPath, [path.join(directory, 'scripts/build.mjs')], { stdio: 'pipe' }), /Command failed/);
  assert.equal(fs.readFileSync(index, 'utf8'), 'previous-page');
  assert(fs.existsSync(path.join(directory, 'dist/web-images/test/main-12345678901234.webp')));
}));

test('parent-directory image paths are rejected', () => fixture(directory => {
  const source = path.join(directory, 'data/catalog.json');
  const data = JSON.parse(fs.readFileSync(source, 'utf8'));
  data.models[0].products[0].images.main.url = 'web-images/../../private.webp';
  fs.writeFileSync(source, JSON.stringify(data));
  assert.throws(() => prepareCatalog(directory), /Invalid image path/);
}));

test('availability removes marked products and empty models', () => fixture(directory => {
  const source=path.join(directory,'data/catalog.json');
  const catalog=JSON.parse(fs.readFileSync(source,'utf8'));
  const product=catalog.models[0].products[0];
  product.id='sold';product.sku='sold';product.specs={priceCny:100};
  catalog.models[0].id='collection';catalog.models[0].defaultSku='sold';
  catalog.models[0].products.push({...product,id:'available',sku:'available',specs:{priceCny:200}});
  fs.writeFileSync(source,JSON.stringify(catalog));
  fs.writeFileSync(path.join(directory,'data/availability.json'),JSON.stringify({unavailableProducts:['sold']}));
  const available=readCatalog(directory);
  assert.equal(available.models[0].products.length,1);
  assert.equal(available.models[0].defaultSku,'available');
  assert.equal(available.models[0].priceFromCny,200);
  fs.writeFileSync(path.join(directory,'data/availability.json'),JSON.stringify({unavailableModels:['collection']}));
  assert.equal(readCatalog(directory).models.length,0);
}));

test('supplemental collection files merge without replacing original data', () => fixture(directory => {
  const source=path.join(directory,'data/catalog.json');
  const before=digest(source);
  const catalog=JSON.parse(fs.readFileSync(source,'utf8'));
  catalog.models[0].id='original';catalog.models[0].products[0].id='original-product';
  fs.writeFileSync(source,JSON.stringify(catalog));
  const existing=digest(source);
  fs.mkdirSync(path.join(directory,'data/collections'));
  fs.writeFileSync(path.join(directory,'data/collections/slim.json'),JSON.stringify({id:'slim-test',series:'slim',products:[{id:'slim-product'}]}));
  const merged=readCatalog(directory);
  assert.equal(merged.models.length,2);
  assert.equal(merged.models[0].id,'original');
  assert(merged.categories.includes('slim'));
  assert.equal(digest(source),existing);
  assert.notEqual(before,existing);
}));

test('supplemental collections reject duplicate model IDs', () => fixture(directory => {
  fs.mkdirSync(path.join(directory,'data/collections'));
  fs.writeFileSync(path.join(directory,'data/collections/duplicate.json'),JSON.stringify({id:undefined,products:[]}));
  assert.throws(()=>readCatalog(directory),/Invalid collection/);
  const source=JSON.parse(fs.readFileSync(path.join(directory,'data/catalog.json'),'utf8'));
  source.models[0].id='duplicate';fs.writeFileSync(path.join(directory,'data/catalog.json'),JSON.stringify(source));
  fs.writeFileSync(path.join(directory,'data/collections/duplicate.json'),JSON.stringify({id:'duplicate',products:[]}));
  assert.throws(()=>readCatalog(directory),/Duplicate model IDs/);
}));

test('a source-only checkout generates the complete site', () => fixture(directory => {
  assert(!fs.existsSync(path.join(directory, 'dist/index.html')));
  assert(!fs.existsSync(path.join(directory, 'dist/assets')));
  execFileSync(process.execPath, [path.join(directory, 'scripts/build.mjs')]);
  const html = fs.readFileSync(path.join(directory, 'dist/index.html'), 'utf8');
  assert(!/__STYLES__|__DATA__|__APP__|__MEDIA__/.test(html));
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) {
    assert(fs.existsSync(path.join(directory, 'dist', match[1])));
  }
  assert(fs.existsSync(path.join(directory, 'dist/_headers')));
  assert.equal(publishedCatalog(directory).models.length, 1);
}));

test('build removes private notes but preserves all source images', () => fixture(directory => {
  const photo = path.join(directory, 'dist/web-images/test/main-12345678901234.webp');
  const before = digest(photo);
  fs.writeFileSync(path.join(directory, 'dist/web-images/test/internal.md'), 'Private source path');
  execFileSync(process.execPath, [path.join(directory, 'scripts/build.mjs')]);
  assert.equal(digest(photo), before);
  assert(!fs.existsSync(path.join(directory, 'dist/web-images/test/internal.md')));
}));

test('repeated production builds are deterministic and keep photos intact', () => {
  const source = path.join(root, 'data/catalog.json');
  const sample = path.join(root, 'dist/web-images/tonneau/007/007/main-main-69521480816255.webp');
  const before = [digest(source), digest(sample)];
  execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')]);
  const first = digest(path.join(root, 'dist/index.html'));
  execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')]);
  assert.equal(digest(path.join(root, 'dist/index.html')), first);
  assert.deepEqual([digest(source), digest(sample)], before);
  assert.equal(publishedCatalog(root).models.length, readCatalog(root).models.length);
});
