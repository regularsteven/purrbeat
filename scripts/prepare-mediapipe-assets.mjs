import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const root = process.cwd();
const sourcePkgDir = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision');
const sourceBundle = path.join(sourcePkgDir, 'vision_bundle.mjs');
const sourceWasmDir = path.join(sourcePkgDir, 'wasm');

const targetDir = path.join(root, 'src', 'assets', 'mediapipe');
const targetWasmDir = path.join(targetDir, 'wasm');
const targetBundleMjs = path.join(targetDir, 'vision_bundle.mjs');
const targetBundleJs = path.join(targetDir, 'vision_bundle.js');
const targetModel = path.join(targetDir, 'hand_landmarker.task');

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const MIN_MODEL_BYTES = 1_000_000;

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(source, destination) {
  fs.copyFileSync(source, destination);
}

function copyDir(source, destination) {
  ensureDirectory(destination);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const s = path.join(source, entry.name);
    const d = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function shouldDownloadModel() {
  if (process.env.MEDIAPIPE_REFRESH === '1') return true;
  if (!fs.existsSync(targetModel)) return true;
  const stat = fs.statSync(targetModel);
  return stat.size < MIN_MODEL_BYTES;
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        downloadFile(response.headers.location, destination).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Download failed (${response.statusCode}) from ${url}`));
        return;
      }

      const file = fs.createWriteStream(destination);
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (error) => {
        fs.rmSync(destination, { force: true });
        reject(error);
      });
    });

    request.on('error', (error) => reject(error));
  });
}

function assertSourceAssets() {
  if (!fs.existsSync(sourceBundle) || !fs.existsSync(sourceWasmDir)) {
    throw new Error('Missing @mediapipe/tasks-vision package files. Run `npm install` first.');
  }
}

async function main() {
  assertSourceAssets();
  ensureDirectory(targetDir);
  ensureDirectory(targetWasmDir);

  copyFile(sourceBundle, targetBundleMjs);
  copyFile(sourceBundle, targetBundleJs);
  copyDir(sourceWasmDir, targetWasmDir);

  if (shouldDownloadModel()) {
    await downloadFile(MODEL_URL, targetModel);
    const size = fs.statSync(targetModel).size;
    if (size < MIN_MODEL_BYTES) {
      throw new Error(`Downloaded model seems invalid (size=${size} bytes).`);
    }
    console.log(`Downloaded hand_landmarker.task (${size} bytes)`);
  } else {
    console.log('hand_landmarker.task already present; skipping download');
  }

  console.log('Prepared MediaPipe assets in src/assets/mediapipe');
}

main().catch((error) => {
  console.error(`MediaPipe asset preparation failed: ${error.message}`);
  process.exit(1);
});
