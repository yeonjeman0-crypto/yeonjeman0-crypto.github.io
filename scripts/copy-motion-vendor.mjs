import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(path.join(root, 'node_modules/animejs/package.json'), 'utf8'));
if (pkg.version !== '4.5.0') throw new Error('The website pins Anime.js to 4.5.0; update the HTML and vendor script together.');
const dest = path.join(root, 'js/vendor');
await mkdir(dest, { recursive: true });
await copyFile(path.join(root, 'node_modules/animejs/dist/bundles/anime.umd.min.js'), path.join(dest, 'animejs-4.5.0.min.js'));
await copyFile(path.join(root, 'node_modules/animejs/LICENSE.md'), path.join(dest, 'ANIMEJS-LICENSE.md'));
console.log('Copied Anime.js 4.5.0 and its MIT license into the static deployment root.');
