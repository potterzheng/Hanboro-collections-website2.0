import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
const models = catalog.models;
assert.equal(new Set(models.map(model => model.id)).size, models.length);
const products = models.flatMap(model => model.products);
assert.equal(new Set(products.map(product => product.id)).size, products.length);
assert(products.every(product => !product.outOfStock));
const images = products.flatMap(product => [product.images.main, ...product.images.gallery, ...product.images.overview, ...product.variants.flatMap(variant => variant.images)]).filter(Boolean);
for (const image of images) {
  assert.notEqual(image.role, 'packaging');
  for (const url of [image.url, image.thumb]) {
    assert(url.startsWith('web-images/') && !url.includes('..'));
    assert(fs.existsSync(path.join(root, 'public', url)), `Missing image: ${url}`);
  }
}
const text = JSON.stringify(catalog);
assert(!/sourcePath|sourceFolder|sourceRoots|sourceSha256|parameterFiles|[A-Z]:\\\\|file:\/\//i.test(text), 'Private source metadata must not be published');
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
assert(!/__STYLES__|__DATA__|__APP__/.test(html));
assert(fs.statSync(path.join(root, 'dist/index.html')).size < 10000);
console.log(`Checked ${models.length} models, ${products.length} SKUs, and ${new Set(images.map(image => image.url)).size} image references.`);
