// No dependencies, no rewriting production source. Creates an isolated,
// allowlisted static output directory for Cloudflare Pages deployment.
import { existsSync, readdirSync, mkdirSync, rmSync, lstatSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'dist');
const publicDirs = ['assets', 'packages', 'previews'];
const publicContentFiles = ['content/homepage.json', 'content/packages.json'];
const publicExtensions = new Set(['.html', '.css', '.js', '.svg', '.ico', '.txt', '.xml', '.webmanifest']);
const excludeRoot = new Set(['vercel.json', 'package.json', 'package-lock.json', 'wrangler.json', 'wrangler.jsonc']);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // Cloudflare Pages single-asset limit.

function copyPublic(from, to) {
  const stats = lstatSync(from);
  if (stats.isSymbolicLink?.()) throw new Error('Symbolic links are not deployable: ' + from);
  if (stats.isDirectory()) {
    mkdirSync(to, { recursive: true });
    for (const ent of readdirSync(from, { withFileTypes: true })) {
      if (ent.isSymbolicLink()) throw new Error('Symbolic links are not deployable: ' + ent.name);
      copyPublic(join(from, ent.name), join(to, ent.name));
    }
  } else if (stats.isFile()) {
    if (stats.size > MAX_FILE_SIZE) throw new Error(`Asset exceeds 25 MiB: ${from} (${stats.size} bytes)`);
    mkdirSync(resolve(to, '..'), { recursive: true });
    copyFileSync(from, to);
  } else {
    throw new Error('Unsupported public asset: ' + from);
  }
}

if (existsSync(output)) rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const ent of readdirSync(root, { withFileTypes: true })) {
  if (ent.isFile() && publicExtensions.has(extname(ent.name)) && !excludeRoot.has(ent.name)) {
    copyPublic(join(root, ent.name), join(output, ent.name));
  }
}
for (const dirname of publicDirs) if (existsSync(join(root, dirname))) {
  copyPublic(join(root, dirname), join(output, dirname));
}
for (const path of publicContentFiles) {
  if (!existsSync(join(root, path))) throw new Error('Missing CMS content: ' + path);
  copyPublic(join(root, path), join(output, path));
}

// Match preview anti-indexing until owner explicitly authorizes go-live SEO.
writeFileSync(join(output, '_headers'), `/*
  X-Robots-Tag: noindex, nofollow, noarchive
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: public, max-age=0, must-revalidate
`);
// Only /api/locale invokes a Function; all other pages/assets stay on the free static path.
writeFileSync(join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
writeFileSync(join(output, '_routes.json'), JSON.stringify({version: 1, include: ['/api/locale'], exclude: []}, null, 2) + '\n');

for (const required of ['index.html', 'app.js', 'locale-controller.js', 'locale-rules.js', 'river-atelier.js', 'river-atelier.css', 'river.css', 'assets/atelier-water.webp', 'assets/river-yacht.webp', 'assets/atelier-wake.webp', 'content/homepage.json', 'content/packages.json', 'water-world.js', 'water-yacht.js']) {
  if (!existsSync(join(output, required))) throw new Error('Missing required production asset: ' + required);
}
console.log('Cloudflare output ready: dist/; Vercel source and deployment untouched.');
