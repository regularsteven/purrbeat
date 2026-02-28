import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const envPath = path.join(root, '.env');
const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const match = envText.match(/^DEPLOY_DIR=(.+)$/m);
const deployDir = match?.[1]?.trim();
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}
if (!deployDir) {
  console.error('Missing DEPLOY_DIR in .env');
  process.exit(1);
}

const targetDir = path.resolve(root, deployDir);
fs.mkdirSync(targetDir, { recursive: true });

const copied = [];
for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
  const source = path.join(distDir, entry.name);
  const destination = path.join(targetDir, entry.name);
  fs.cpSync(source, destination, { recursive: true, force: true });
  copied.push(entry.name);
}

console.log(`Deployed dist contents to ${targetDir}`);
console.log(`Copied: ${copied.join(', ')}`);
