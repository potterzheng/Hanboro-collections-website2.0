import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepareCatalog } from './site-assets.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const out = path.join(root, 'dist');
if (fs.existsSync(out) && fs.lstatSync(out).isSymbolicLink()) throw new Error('dist must not be a symlink');

// Validate every image before replacing any generated page or asset.
const { catalog, references, remapped } = prepareCatalog(root);
const icons = JSON.parse(fs.readFileSync(path.join(root, 'src/icons.json'), 'utf8'));
const styles = fs.readFileSync(path.join(root, 'src/catalog.css'), 'utf8');
const app = ['purchase-state.js', 'online.js', 'inquiry-document.js', 'catalog.js'].map(name => fs.readFileSync(path.join(root, 'src', name), 'utf8')).join('\n');
const template = fs.readFileSync(path.join(root, 'src/catalog.template.html'), 'utf8');
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
const generated = new Set();
function asset(stem, extension, content) {
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  const name = `assets/${stem}-${hash}.${extension}`;
  fs.writeFileSync(path.join(out, name), content);
  generated.add(path.basename(name));
  return name;
}
const data = asset('catalog', 'js', `const CATALOG = ${JSON.stringify(catalog).replace(/</g, '\\u003c')};\nconst ICONS = ${JSON.stringify(icons)};\nconst MEDIA = {};\n`);
const css = asset('catalog', 'css', styles);
const js = asset('app', 'js', app);
const html = template
  .replace('<style>__STYLES__</style>', `<link rel="stylesheet" href="${css}">`)
  .replace(/<script>[\s\S]*?<\/script>/, `<script src="${data}" defer></script>\n  <script src="${js}" defer></script>`);
if (/__STYLES__|__DATA__|__APP__|__MEDIA__/.test(html)) throw new Error('Unresolved page template');
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/web-images/*\n  Cache-Control: no-cache\n');

// Only prune files owned by this generator; never delete the image directory.
for (const name of fs.readdirSync(path.join(out, 'assets'))) {
  if (/^(?:app|catalog)-[a-f0-9]{12}\.(?:js|css)$/.test(name) && !generated.has(name)) fs.unlinkSync(path.join(out, 'assets', name));
}
function removePrivateNotes(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Image directories must not contain symlinks');
    if (entry.isDirectory()) removePrivateNotes(file);
    else if (/\.md$/i.test(entry.name) || ['image-index.json', 'inquiry-previews.json'].includes(entry.name)) fs.unlinkSync(file);
  }
}
removePrivateNotes(path.join(out, 'web-images'));
console.log(`Built ${catalog.models.length} collections; verified ${references.length} image files; resolved ${remapped} legacy image names. Images preserved in dist/web-images/.`);
