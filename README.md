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

## Development workflow

This project follows a branching workflow so every new feature or fix is built in isolation before it reaches production.

1. **Branching convention** – Start from `dev`, create a feature branch with a short, descriptive name (you can use `dev/feature-name` or `feature/short-description`). Don’t work directly on `main`, `test`, or `dev` except for merging.
2. **Development loop** – Make changes, run `npm run dev` or `npm run test` locally, then commit with a clear message. Push the feature branch to GitHub, open a PR targeting `dev`, and request review if needed.
3. **Merging path** – Once the feature branch is approved and merged into `dev`, we’ll eventually merge `dev` into `test` (the staging branch). Right now `test.purrbeat.codysites.com` is planned but not yet wired up; keep the same flow so the staging deployment can be turned on smoothly later.
4. **Production release** – When `test` is ready, create a PR from `test` to `main`. The live site `https://purrbeat.codysites.com` is automatically updated via GitHub Actions whenever `main` receives new commits.
5. **Agent responsibilities** – Whenever you’re asked to ship work, create the feature branch yourself, pick a meaningful name, and repeat steps 2‑4. Mention the workflow in documentation updates so other agents/operators know how to follow the same path.

Keeping this workflow documented here ensures future contributors have a predictable path from idea → dev → test → production.

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
