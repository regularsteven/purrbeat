# AGENTS Instructions

## Deploy Rule

- If `.env` contains a deploy destination (`DEPLOY_DIR`) and it is non-empty, run:
  1. `npm run build`
  2. `npm run deploy`
- Always run build before deploy.
- If `DEPLOY_DIR` is missing or empty, do not run deploy.
