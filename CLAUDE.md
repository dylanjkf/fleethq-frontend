# CLAUDE.md

This is the FleetHQ office web app — a React/TypeScript/Vite SPA. It is one
of two repositories that make up FleetOS:

- **This repo (`fleethq-frontend`)**: the FleetHQ dashboard UI only. Deploys
  to Vercel.
- [`fleethq-platform`](https://github.com/dylanjkf/fleethq-platform): the API,
  DriverOS mobile app, database schema, and the full product specification
  (`FleetOS-Playbook/`). Deploys to Railway (API) and app stores (DriverOS).

**Read `FleetOS-Playbook/` in `fleethq-platform` before making product
decisions** — terminology (Asset/Operator/Attached Unit, not
Vehicle/Driver/Trailer), the permissions model, compliance rules, and the
commercial priority (finish the courier vertical first) all live there. This
repo has no local copy to avoid two sources of truth drifting apart.

## Rules specific to this repo

- **This app only talks to the API over HTTPS**, via `src/api/client.ts`.
  Never add a direct database connection, a local import of backend code, or
  a same-repo API route — those belong in `fleethq-platform`.
- **No new pages, copy, or marketing content.** This is the existing product
  dashboard, not a marketing site — don't add anything beyond what the
  current features need.
- **Permissions are granular, not role-based** — `src/lib/permissions.ts`
  mirrors the backend's permission catalog exactly (it's a deliberate,
  documented duplication — see the file's header comment). Never hardcode
  `if (role === 'admin')`.
- **Offline-first**: this app is the office dashboard, not DriverOS, so it is
  less offline-critical, but the PWA shell (`public/sw.js`) still caches for
  installability and fast reloads — don't break that when touching routing
  or the service worker.
