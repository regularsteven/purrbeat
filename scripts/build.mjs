import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const dist = path.join(root, 'dist');

const buildStamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
let gitShort = 'nogit';
try {
  gitShort = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim();
} catch {
  // noop
}
const version = `${buildStamp}-${gitShort}`;

fs.writeFileSync(path.join(root, 'src', 'version.js'), `export const APP_VERSION = '${version}';\n`);

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const copyDir = (src, dest) => {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
};

copyDir(path.join(root, 'src'), path.join(dist, 'src'));

const rewriteJsImports = (dirPath) => {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const target = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      rewriteJsImports(target);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;

    const source = fs.readFileSync(target, 'utf8');
    const rewritten = source.replace(
      /(from\s+['"])(\.?\.?\/[^'"]+\.js)(['"])/g,
      (_m, p1, spec, p3) => `${p1}${spec}?v=${version}${p3}`,
    );
    fs.writeFileSync(target, rewritten);
  }
};

rewriteJsImports(path.join(dist, 'src'));

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(
  './src/main.js',
  `./src/main.js?v=${version}`,
);
fs.writeFileSync(path.join(dist, 'index.html'), indexHtml);

fs.copyFileSync(path.join(root, 'engine.html'), path.join(dist, 'engine.html'));

console.log(`Build complete: dist/ (version ${version})`);
