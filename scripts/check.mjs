import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { prepareCatalog, publishedCatalog, imageObjects } from './site-assets.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const { catalog } = prepareCatalog(root);
const published = publishedCatalog(root);
assert.deepEqual(published, catalog, 'Published data is stale; run npm run build');
const models = catalog.models;
const products = models.flatMap(model => model.products);
assert.equal(new Set(models.map(model => model.id)).size, models.length);
assert.equal(new Set(products.map(product => product.id)).size, products.length);
assert(products.every(product => !product.outOfStock));
const references = new Set(imageObjects(catalog).flatMap(image => [image.url, image.thumb]));
for (const url of references) {
  const bytes = fs.readFileSync(path.join(root, 'dist', url));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', url);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', url);
}
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
assert(!/__STYLES__|__DATA__|__APP__|__MEDIA__/.test(html));
for (const match of html.matchAll(/(?:src|href)="(assets\/[^\"]+)"/g)) {
  const text = fs.readFileSync(path.join(root, 'dist', match[1]), 'utf8');
  if (match[1].endsWith('.js')) new vm.Script(text, { filename: match[1] });
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
assert.equal(config.name, 'hanboro-collections-website2-0');
assert.equal(config.assets.directory, './dist');
console.log(`Checked ${models.length} models, ${products.length} SKUs, ${references.size} image files and Cloudflare static-asset configuration.`);
