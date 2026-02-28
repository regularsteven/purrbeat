# MediaPipe assets

These files are managed by `scripts/prepare-mediapipe-assets.mjs`.

- `vision_bundle.js` (primary) and `vision_bundle.mjs` (fallback) are copied from `@mediapipe/tasks-vision`
- `wasm/*` is copied from `@mediapipe/tasks-vision/wasm`
- `hand_landmarker.task` is downloaded from the official MediaPipe model URL

Run:

```bash
npm run prepare:mediapipe
```

Or just run `npm run build`, which runs asset preparation automatically.
