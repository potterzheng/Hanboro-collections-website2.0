import fs from 'node:fs';
import path from 'node:path';

export function imageObjects(catalog) {
  return catalog.models.flatMap(model => [model.images.main, ...model.products.flatMap(product => [product.images.main, ...product.images.overview, ...product.images.gallery, ...product.variants.flatMap(variant => [variant.image, ...variant.images])])]).filter(Boolean);
}

export function prepareCatalog(root) {
  const text = fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8');
  if (/"(?:sourcePath|sourceFolder|sourceRoots|sourceSha256|parameterFiles)"|[A-Z]:\\\\|file:\/\//i.test(text)) throw new Error('Product data contains private source metadata');
  const catalog = JSON.parse(text);
  const resolved = new Map();
  const missing = new Set();
  let remapped = 0;
  for (const image of imageObjects(catalog)) {
    if (image.role === 'packaging') throw new Error('Packaging images must not be displayed');
    for (const key of ['url', 'thumb']) {
      const url = image[key];
      if (typeof url !== 'string' || !url.startsWith('web-images/') || url.split('/').some(part => part === '..' || part === '.') || url.includes('\\')) throw new Error('Invalid image path: ' + url);
      if (!resolved.has(url)) {
        const legacy = url.replace(/-[a-f0-9]{12}(?=\.webp$)/, '');
        const found = [url, legacy].find(candidate => {
          const file = path.join(root, 'dist', candidate);
          return fs.existsSync(file) && fs.statSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink();
        });
        if (!found) missing.add('dist/' + url);
        else { resolved.set(url, found); if (found !== url) remapped++; }
      }
      if (resolved.has(url)) image[key] = resolved.get(url);
    }
  }
  if (missing.size) throw new Error(`Missing ${missing.size} required image files in dist/web-images/. Existing images were not removed.\n${[...missing].slice(0, 12).join('\n')}`);
  return { catalog, references: [...new Set(resolved.values())], remapped };
}

export function publishedCatalog(root) {
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const source = html.match(/src="(assets\/catalog-[a-f0-9]{12}\.js)"/)?.[1];
  if (!source) throw new Error('Published product data was not found');
  const code = fs.readFileSync(path.join(root, 'dist', source), 'utf8');
  const start = 'const CATALOG = '.length;
  return JSON.parse(code.slice(start, code.indexOf(';\n', start)));
}
