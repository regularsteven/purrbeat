# AGENTS Instructions

## Deploy Rule

- If `.env` contains a deploy destination (`DEPLOY_DIR`) and it is non-empty, run:
  1. `npm run build`
  2. `npm run deploy`
- Always run build before deploy.
- If `DEPLOY_DIR` is missing or empty, do not run deploy.
- provide instructions if any new npm commands are required

## PR Link Rule

- Always include the GitHub pull request link when summarizing or reporting work related to this repo.

## Branch & Release Workflow

- Start every job from the `dev` branch. Create a focused feature branch (`feature/...`) off `dev` and develop until you feel satisfied with it.
- When a branch is ready, merge it into `dev` yourself; Steve should not need to see or approve each feature branch.
- Once `dev` holds all requested work that is ready for testing, merge `dev` into `test` yourself. This keeps `test` in sync with human-ready changes so Steve can `git checkout test` and pull without handling merges.
- Never merge or open a PR into `main` until Steve says “I want this live.” At that point, open a PR (typically `test` → `main`), share the URL, and let Steve do the final merge. After the merge, GitHub Actions will deploy to https://purrbeat.codysites.com/demo.
- Mention the live PR link in every report and do not merge to `main` yourself even after opening the PR.
