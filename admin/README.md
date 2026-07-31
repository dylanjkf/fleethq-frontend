# FleetHQ Admin

The internal FleetHQ staff console — a separate app from the customer-facing
office dashboard (`../`), deployed at `fleethq.online/admin` (see
`../vercel.json`'s multi-app build/rewrite wiring), talking to `/v1/admin/*`
on the same API via its own, completely separate authentication (see
`fleethq-platform`'s `FleetOS-Playbook/21-Admin-Platform/Overview.md`).
Desktop-only internal tool: single dark theme, no offline support, no PWA.

Split out of `fleethq-platform` and folded into this repo as a sibling app
(own `package.json`/build, own bundle) rather than merged into the customer
SPA's route tree, so a staff-only bundle never ships to every customer
visitor and the separate-auth isolation Phase 1 was built around is
preserved — just co-located and co-deployed under the same domain.

## Local development

```bash
npm install
npm run dev     # http://localhost:5175/admin/, proxies /v1 and /health to
                 # http://localhost:3000 (see vite.config.ts) — run
                 # fleethq-platform/api locally alongside this, with an
                 # AdminUser already bootstrapped (see api/scripts/bootstrap-admin.ts)
npm run build
npm run lint     # oxlint
npm test         # vitest
```

## Environment variables

See `.env.example`. `VITE_API_BASE` must be set to the deployed API's
absolute URL for any build that isn't local dev — there is no same-origin
fallback once this is deployed separately from the API.

## Structure

```
src/api/          typed HTTP client — one file per admin backend module
src/app/          providers (auth), routing, shell/nav
src/components/ui/ shared UI kit (Button, Card, Table bits, dialogs...)
src/features/      one directory per admin section (dashboard, organisations,
                   customer-users, support, feature-flags, system, fleet,
                   audit-log, settings)
```

Every page is gated on the granted admin permission it needs
(`useAuth().hasPermission(key)`) — the same permission keys the backend's
`AdminPermissionGuard` enforces, so a hidden nav item / tab always matches a
route that would 403 anyway rather than the two silently drifting apart.

## Known scope decisions (not gaps)

- **Impersonation** still shows the minted customer access token in a dialog
  for the admin to copy manually, rather than a same-tab handoff into the
  sibling office-dashboard app. Now that both apps share an origin this
  could become a real redirect (e.g. `../` reading the token from a
  short-lived handoff channel) — deliberately not built yet, since that's
  new integration work, not part of this app's move into this repo.
- **No light theme.** Single dark console theme, v1 decision (see
  `src/index.css`).
- **No component tests yet** (`test` script exists, `--passWithNoTests` so
  CI doesn't hard-fail on an empty suite) — carried over from this app's
  original build; still open.
