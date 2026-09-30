// Build: bundles the game with esbuild and inlines script, style and fonts
// into one self-contained dist/index.html. Usage: node build.mjs
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const app = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true, write: false, format: 'iife', target: 'es2020', minify: true, legalComments: 'none', logLevel: 'warning',
});
const code = app.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const read = (f) => readFileSync(path.join(root, f), 'utf8');
const html = read('src/index.html')
  .replace('/*FONTS*/', () => read('src/fonts.css'))
  .replace('/*STYLE*/', () => read('src/style.css'))
  .replace('/*APP*/', () => code);
mkdirSync(path.join(root, 'dist'), { recursive: true });
writeFileSync(path.join(root, 'dist/index.html'), html);
console.log(`dist/index.html ${(html.length / 1024).toFixed(0)} KB`);
