# FleetHQ

The FleetHQ office web app — the dashboard fleet managers, dispatchers and
workshop staff use for dispatch, compliance, workshop, reporting and admin.
React + TypeScript + Vite SPA, installable as a PWA.

This app talks to the [`fleethq-platform`](https://github.com/dylanjkf/fleethq-platform)
API exclusively over HTTPS/REST — there is no direct database access, no
shared filesystem, and no local imports into backend code. See
`src/api/client.ts`.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173, proxies /v1 and /health to
                      # http://localhost:3000 (see vite.config.ts) — run
                      # fleethq-platform's api locally alongside this
npm run build         # production build -> dist/
npm run lint
npm test
```

Set `HTTPS=true npm run dev` to serve over a self-signed TLS cert (needed to
exercise the PWA/service worker on a real device — see `npm run dev:lan` for
the LAN-reachable variant).

## Environment variables

Copy `.env.example` to `.env.production` before a production build (Vite
bakes `VITE_*` vars into the bundle at build time — there is no runtime env
var for a static SPA). All are optional for a working build; unset falls
back to safe defaults.

| Variable | Purpose | Required |
| --- | --- | --- |
| `VITE_API_URL` | Absolute base URL of the deployed `fleethq-platform` API, e.g. `https://api.fleethq.online` (no trailing slash). Unset falls back to same-origin `/`, which only works when this app and the API share an origin — not the case in production. | Yes, in any deployed environment |
| `VITE_SENTRY_DSN` | Error tracking (see `src/instrument.ts`). Unset is a safe no-op. | No |
| `VITE_STRIPE_PRICE_ID` | The Stripe Price ID the Billing page's "Subscribe" button checks out. Unset explains no plan is configured rather than sending an empty priceId. | No |

## Deployment (Vercel)

This repo deploys as a static SPA build. `vercel.json` at the repo root
configures the build and the SPA fallback rewrite so client-side routes
(e.g. `/dispatch`, `/compliance`) don't 404 on a hard reload:

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

1. Import this repository into Vercel (New Project → this repo). Vercel
   auto-detects the build from `vercel.json`.
2. Set `VITE_API_URL` (and `VITE_SENTRY_DSN`/`VITE_STRIPE_PRICE_ID` if used)
   under Project Settings → Environment Variables, for Production, Preview
   and Development as appropriate.
3. Point the production domain (e.g. `app.fleethq.online`) at this Vercel
   project under Project Settings → Domains, and add the corresponding CNAME
   at your DNS provider.
4. Every push to `main` deploys to production; every PR gets a preview
   deployment (gated behind Vercel's own preview authentication).

The API must allow this app's origin(s) via CORS — see `fleethq-platform`'s
`CORS_ALLOWED_ORIGINS` env var.

## Structure

```
src/
  api/        one file per resource, all routed through api/client.ts
  features/   one folder per feature area (dispatch, compliance, workshop, ...)
  lib/        shared client-side utilities (permissions mirror, sw registration, ...)
  test/       Vitest setup
public/       manifest, service worker (sw.js), icons
```

`src/lib/permissions.ts` intentionally mirrors
`fleethq-platform/api/src/common/permissions/permission-catalog.ts` — these
are two separate deployables with no shared package, so this one file is a
deliberate, documented duplication (see its header comment), not drift.
