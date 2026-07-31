# FleetHQ

The FleetHQ office web app — the dashboard fleet managers, dispatchers and
workshop staff use for dispatch, compliance, workshop, reporting and admin.
React + TypeScript + Vite SPA, installable as a PWA.

This app talks to the [`fleethq-platform`](https://github.com/dylanjkf/fleethq-platform)
API exclusively over HTTPS/REST — there is no direct database access, no
shared filesystem, and no local imports into backend code. See
`src/api/client.ts`.

This repo also contains `admin/`, the FleetHQ *staff* console — a
completely separate app (own `package.json`/build/auth) deployed alongside
this one at `fleethq.online/admin`. See `admin/README.md`. The two apps
share nothing but this repo and a deploy domain: no shared code, no shared
session, no shared bundle.

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

This repo deploys as a single Vercel project serving **two** static SPA
builds from one origin — this app at `/` and `admin/` at `/admin`.
`vercel.json` at the repo root builds both and stitches admin's output into
`dist/admin/` before Vercel uploads it, then routes each app's client-side
paths to its own `index.html` so a hard reload on e.g. `/dispatch` or
`/admin/organisations` doesn't 404:

```json
{
  "buildCommand": "npm install && npm run build && npm --prefix admin install && npm --prefix admin run build && rm -rf dist/admin && mv admin/dist dist/admin",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/admin/(.*)", "destination": "/admin/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The `/admin/(.*)` rewrite must come first — Vercel evaluates `rewrites` in
order, and the catch-all `/(.*)` would otherwise swallow every `/admin/*`
request first. Static assets (`/admin/assets/*.js`) are still served
directly from the output directory; the rewrite only kicks in for a path
that isn't a real file, i.e. a client-side route.

1. Import this repository into Vercel (New Project → this repo). Vercel
   auto-detects the build from `vercel.json`.
2. Set `VITE_API_URL` (and `VITE_SENTRY_DSN`/`VITE_STRIPE_PRICE_ID` if used)
   under Project Settings → Environment Variables, for Production, Preview
   and Development as appropriate. `admin/`'s own `VITE_API_BASE` (see
   `admin/.env.example`) needs setting too — Vite only bakes in vars
   prefixed for the app being built, so both must be set on the one Vercel
   project.
3. Point the production domain (e.g. `fleethq.online`) at this Vercel
   project under Project Settings → Domains, and add the corresponding CNAME
   at your DNS provider. `/admin` needs no separate domain/DNS entry — it's
   served by the same deployment.
4. Every push to `main` deploys to production; every PR gets a preview
   deployment (gated behind Vercel's own preview authentication) — a
   preview covers both apps together, from the one build.

The API must allow this origin via CORS for **both** apps — see
`fleethq-platform`'s `CORS_ALLOWED_ORIGINS` env var; there's only one origin
to add even though two apps are served from it.

**Not yet verified against a live Vercel deployment** — the multi-app build
command and rewrite ordering above were verified by running the exact build
command locally (`dist/admin/index.html` renders with correctly
`/admin/`-prefixed asset URLs) but not against a real Vercel build/CDN. Spot
-check `/admin` after the first deploy with this config.

## Structure

```
src/
  api/        one file per resource, all routed through api/client.ts
  features/   one folder per feature area (dispatch, compliance, workshop, ...)
  lib/        shared client-side utilities (permissions mirror, sw registration, ...)
  test/       Vitest setup
public/       manifest, service worker (sw.js), icons
admin/        the FleetHQ staff console — a fully separate app, own README
```

`src/lib/permissions.ts` intentionally mirrors
`fleethq-platform/api/src/common/permissions/permission-catalog.ts` — these
are two separate deployables with no shared package, so this one file is a
deliberate, documented duplication (see its header comment), not drift.
