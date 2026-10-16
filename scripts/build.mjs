import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'dist');
if (path.dirname(out) !== path.resolve(root) || path.basename(out) !== 'dist') throw new Error('Unsafe output directory');
if (fs.existsSync(out)) {
  if (fs.lstatSync(out).isSymbolicLink()) throw new Error('Output must not be a symlink');
  console.log(`Replacing generated output only: ${out}`);
  fs.rmSync(out, { recursive: true });
}
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });

function asset(stem, extension, content) {
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  const name = `assets/${stem}-${hash}.${extension}`;
  fs.writeFileSync(path.join(out, name), content);
  return name;
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
const imageUrls = new Set(catalog.models.flatMap(model => model.products.flatMap(product => [product.images.main, ...product.images.overview, ...product.images.gallery, ...product.variants.flatMap(variant => variant.images)]).filter(Boolean).flatMap(image => [image.url, image.thumb])));
for (const url of imageUrls) {
  if (!url.startsWith('web-images/') || url.includes('..')) throw new Error('Invalid image reference');
  const destination = path.join(out, url);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, 'public', url), destination);
}
const icons = JSON.parse(fs.readFileSync(path.join(root, 'src/icons.json'), 'utf8'));
const data = asset('catalog', 'js', `const CATALOG = ${JSON.stringify(catalog).replace(/</g, '\\u003c')};\nconst ICONS = ${JSON.stringify(icons)};\nconst MEDIA = {};\n`);
const styles = asset('catalog', 'css', fs.readFileSync(path.join(root, 'src/catalog.css'), 'utf8'));
const app = asset('app', 'js', fs.readFileSync(path.join(root, 'src/online.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/catalog.js'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'src/catalog.template.html'), 'utf8')
  .replace('<style>__STYLES__</style>', `<link rel="stylesheet" href="${styles}">`)
  .replace(/  <script>[\s\S]*?  <\/script>/, `  <script src="${data}" defer></script>\n  <script src="${app}" defer></script>`);
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/web-images/*\n  Cache-Control: public, max-age=31536000, immutable\n');
console.log(`Built ${catalog.models.length} collections in dist/.`);
