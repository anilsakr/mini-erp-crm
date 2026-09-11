# Deployment Guide

**Status: live.** Deployed exactly per this runbook — Neon (Postgres) → Render (backend) → Vercel (frontend), all free tiers, no AWS spend, per the case study's constraints.

## Live URLs

- Frontend: https://mini-erp-crm-frontend-fawn.vercel.app
- Backend: https://mini-erp-crm-44i0.onrender.com
- Health check: https://mini-erp-crm-44i0.onrender.com/health

## 1. Create the Database (Neon)

1. Create a free account at neon.tech and a new project.
2. Copy the connection string it gives you (it looks like `postgresql://<user>:<password>@<host>/<db>?sslmode=require`).
3. Keep it handy — this becomes `DATABASE_URL` on the backend.

Neon's free tier is used for both the "production" database here; a separate Neon branch/project can be used for local development too if you'd rather not install Postgres locally (see README section 14 for the local-Postgres alternative).

## 2. Run Migrations and Seed Against It

From `apps/backend`, with `DATABASE_URL` pointed at the Neon connection string (either export it in your shell or temporarily put it in `apps/backend/.env`):

```bash
cd apps/backend
DATABASE_URL="<neon connection string>" npx prisma migrate deploy
DATABASE_URL="<neon connection string>" npx tsx prisma/seed.ts
```

`migrate deploy` (not `migrate dev`) is used here — it applies existing migrations without trying to generate new ones, which is the correct command for any non-local environment.

## 3. Deploy the Backend (Render)

1. Push this repository to GitHub (see below) — Render deploys from a GitHub repo.
2. In Render, create a **New Web Service**, connect the repo.
3. Settings:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `npm install --include=dev && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node

   The `--include=dev` flag matters: Render (like most PaaS build environments) sets `NODE_ENV=production` before running `npm install`, and npm's default behavior is to skip `devDependencies` entirely when `NODE_ENV=production` — including `typescript` itself. Without this flag the build fails with "tsc: command not found" or missing type-declaration errors. The production `build` script (`tsc -p tsconfig.build.json`) only compiles `src/`, so once the compiler is present the build itself never needs test-only packages like `vitest`/`supertest`.
4. Environment variables (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string |
   | `JWT_SECRET` | a long random string (e.g. `openssl rand -hex 32`) — different from any local dev value |
   | `JWT_EXPIRES_IN` | `8h` |
   | `PORT` | Render sets this automatically; the app already reads `process.env.PORT` |
   | `FRONTEND_URL` | the Vercel URL from step 4 below (update this after the frontend is deployed) |
   | `NODE_ENV` | `production` |

5. Deploy. Render will run the build/start commands above. Because `apps/backend`'s `postinstall` script runs `prisma generate`, the Prisma client is regenerated automatically on every deploy — migrations still need to be applied manually via `prisma migrate deploy` (step 2), or wired into the build command (`npm run build && npx prisma migrate deploy`) if you want migrations to run on every deploy.

## 4. Deploy the Frontend (Vercel)

Because this is an npm-workspaces monorepo, Vercel needs to be told which workspace to build:

1. Import the GitHub repo into Vercel.
2. **Root Directory**: `apps/frontend`.
3. **Build Command**: `npm install --prefix ../.. && npm run build --workspace=apps/frontend` (installs from the monorepo root so workspace linking works, then builds just the frontend) — or simply set the root directory to `apps/frontend` and let Vercel's default `npm install && npm run build` run there directly, since `apps/frontend/package.json` has its own `build` script (`tsc -b && vite build`) with all its own dependencies declared; either approach works, the important part is `Root Directory` is `apps/frontend`.
4. **Output Directory**: `dist` (Vite's default, relative to the root directory).
5. Environment variable: `VITE_API_BASE_URL` = the Render backend URL + `/api`, e.g. `https://mini-erp-crm-backend.onrender.com/api`.
6. Deploy.

## 5. Configure CORS

Go back to Render and set the backend's `FRONTEND_URL` environment variable to the exact Vercel URL (e.g. `https://mini-erp-crm.vercel.app`, no trailing slash), then redeploy the backend. The Express app's CORS middleware (`app.ts`) only allows requests from this exact origin — a mismatch here is the most common cause of "network error" on the deployed frontend even though the backend is healthy.

## 6. Verify

```bash
curl https://<render-backend-url>/health
# expect: {"status":"ok","timestamp":"...","database":"connected"}
```

Then open the Vercel URL and log in with one of the seeded demo accounts (README section 20).

## Notes on Render's Free Tier

Render's free web services spin down after a period of inactivity and take ~30–60 seconds to cold-start on the next request. Worth mentioning proactively during a live recruiter demo ("first request might be slow, that's Render's free tier, not the app").

## GitHub Repository

```bash
gh repo create mini-erp-crm --public --source=. --remote=origin
git push -u origin main
```

(Use `--private` instead of `--public` if you'd rather not make the source public before/during the interview.)

## Gotchas Hit During This Deployment (and the fixes)

Worth knowing for an interview — none of these showed up in local dev, only on the actual platforms:

1. **`npm start` pointed at the wrong compiled path.** `tsconfig.json`'s `rootDir` is `.` (it also type-checks `prisma/` and `tests/`), so `tsc` preserves the `src/` folder under `dist/` — the real entrypoint is `dist/src/server.js`, not `dist/server.js`. Fixed in `package.json`.
2. **Render's build silently skipped all devDependencies**, including `typescript` itself. Platforms that set `NODE_ENV=production` before `npm install` get npm's default behavior of skipping `devDependencies` — reproduced locally with `NODE_ENV=production npm install` to confirm before fixing. Fixed with `npm install --include=dev` in the build command, plus a `tsconfig.build.json` that only compiles `src/` so the deployable artifact never actually needs `vitest`/`supertest`/`@types/*` at runtime.
3. **A TypeScript version resolved on Render rejected the deprecated `moduleResolution: "node"` alias** (`TS5108`) even though the identical semver range built fine locally. Switched to the non-deprecated `"node16"` for both `module` and `moduleResolution`.
4. **Vercel 404'd on any direct URL other than `/`** (e.g. `/login`, `/customers/3`). Static hosts don't know about React Router's client-side routes — only the files that exist in the build. Fixed with a `vercel.json` rewrite sending every path to `index.html`.

## Optional: AWS Architecture (Documented, Not Deployed)

The case study treats AWS as an optional bonus, not a requirement, and explicitly says not to spend money on this assignment. The full AWS architecture — Route 53 → CloudFront → S3 (frontend) + ALB → ECS/Fargate (backend) → RDS PostgreSQL, with Secrets Manager and CloudWatch — is documented in `docs/system-design.md` under "Deployment Architecture" as a discussion of how this system would be deployed at real production scale. It has intentionally **not** been implemented here.
