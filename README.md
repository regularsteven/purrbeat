# purrbeat

Cat Purr Simulator with Vue + WebAudio, kick sequencer, JSON presets, and browser camera gesture controls.

## Scripts

- `npm run build` - runs MediaPipe asset preparation, then copies `index.html`, `engine.html`, and all `src/` assets into `dist/`
- `npm run deploy` - reads `DEPLOY_DIR` from `.env` and copies **dist contents** directly into that folder
- `npm run prepare:mediapipe` - copies runtime files from `node_modules` and downloads `hand_landmarker.task` into `src/assets/mediapipe/`

## Deploy to `/demo/index.html`

Create `.env` in repo root:

```bash
DEPLOY_DIR=/path/to/public_html/demo
```

Then run:

```bash
npm run build
npm run deploy
```

With `DEPLOY_DIR` set to your web root `demo` folder, the app URL is:

- [https://purrbeat.test/demo/index.html](https://purrbeat.test/demo/index.html)

## Gesture controls (v1)

- One open palm swipe left/right: carousel focus through core controls
- One hand index up/down: continuous increase/decrease on focused control
- Two open palms -> two fists: Stop
- Two fists -> two open palms: Start

### Safety gate

Camera control only applies while camera mode is enabled and a valid pose is held long enough to pass gesture debounce.

## MediaPipe self-hosted assets

Assets are prepared automatically during `npm run build` via `scripts/prepare-mediapipe-assets.mjs`.

- Runtime files are copied from `node_modules/@mediapipe/tasks-vision/` (`vision_bundle.js` is generated for servers that do not serve `.mjs` correctly)
- `hand_landmarker.task` is downloaded from the official MediaPipe model URL if missing

To force model refresh:

```bash
MEDIAPIPE_REFRESH=1 npm run prepare:mediapipe
```

## Structure

- `index.html` - app shell with Vue + Tailwind CDNs
- `src/main.js` - app bootstrap
- `src/app.js` - UI layout + bindings + camera gesture HUD
- `src/config/coreControls.js` - shared metadata/ranges for 8 core controls
- `src/composables/usePurrEngine.js` - WebAudio engine + sequencer logic
- `src/composables/useGestureControl.js` - camera + gesture orchestration
- `src/gesture/*` - modular gesture runtime, classification, state machine, actions, and overlay
- `src/assets/mediapipe/*` - self-hosted MediaPipe runtime/model/wasm assets
- `scripts/build.mjs` - build output creator
- `scripts/deploy.mjs` - env-driven deploy copier
