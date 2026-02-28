# purrbeat

This refactor breaks the old monolithic `engine.html` into a small Vue module structure, while styling the UI with Tailwind utility classes.

## Scripts

- `npm run build` - copies `index.html`, `engine.html`, and `src/` into `dist/`
- `npm run deploy` - reads `DEPLOY_DIR` from `.env` and copies `dist/` there

## Deployment setup

Create a `.env` file in the repo root:

```bash
DEPLOY_DIR=/path/to/public_html
```

Then run:

```bash
npm run build
npm run deploy
```

## Structure

- `index.html` - app shell with Vue + Tailwind CDNs
- `src/main.js` - app bootstrap
- `src/app.js` - UI layout + bindings
- `src/composables/usePurrEngine.js` - WebAudio engine and sequencer logic
- `scripts/build.mjs` - build output creator
- `scripts/deploy.mjs` - env-driven deploy copier


## Git hygiene after build/deploy

Recommended `.gitignore` entries include `.env` and `dist/` (already configured in this repo).

On macOS, if these files were already created and showing up as untracked, run:

```bash
git status
git add .gitignore
git rm -r --cached dist public_html 2>/dev/null || true
rm -f .env
git status
```

If `package-lock.json` was created and you want reproducible installs, keep and commit it:

```bash
git add package-lock.json
```
