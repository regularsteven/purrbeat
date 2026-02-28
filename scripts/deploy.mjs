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

fs.mkdirSync(deployDir, { recursive: true });
fs.cpSync(distDir, deployDir, { recursive: true, force: true });
console.log(`Deployed dist/ to ${deployDir}`);
