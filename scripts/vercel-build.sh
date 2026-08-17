#!/usr/bin/env bash
#
# Vercel build entrypoint (A4). Chooses the API base URL (VITE_API_URL) by deploy
# environment so a PR PREVIEW deployment NEVER silently transacts against the
# production API — and therefore the real database and real Stripe account.
#
# Precedence note: Vercel runs `vite build` in production mode, which would
# otherwise load a committed `.env.production`. We deliberately DON'T commit one
# (it violated the repo's own `.gitignore` and was the exact footgun that pointed
# every preview at prod). Instead we export VITE_API_URL here; a shell env var
# that already exists takes priority over any `.env` file in Vite, and is
# inherited by the admin sub-build too.
set -euo pipefail

PROD_API_URL="https://fleethq-platform-production.up.railway.app"

case "${VERCEL_ENV:-development}" in
  production)
    export VITE_API_URL="$PROD_API_URL"
    echo "vercel-build: production build → VITE_API_URL=$VITE_API_URL"
    ;;
  preview)
    # There is no dedicated staging API today (the only deployed API is
    # production on Railway). A preview MUST NOT hit production, so require an
    # explicit non-production API URL and FAIL LOUDLY if one isn't configured —
    # rather than silently building a preview against real prod data.
    if [ -n "${VITE_PREVIEW_API_URL:-}" ]; then
      export VITE_API_URL="$VITE_PREVIEW_API_URL"
      echo "vercel-build: preview build → VITE_API_URL=$VITE_API_URL (from VITE_PREVIEW_API_URL)"
    else
      echo "ERROR: preview build refused." >&2
      echo "Set VITE_PREVIEW_API_URL (a NON-production API) in Vercel → Settings → Environment Variables (Preview scope)." >&2
      echo "Previews must not point at the production API/database/Stripe. No staging API exists yet, so this fails on purpose." >&2
      exit 1
    fi
    ;;
  *)
    # Local `vercel build` / development: leave VITE_API_URL unset so the app
    # talks to its dev-server proxy / same origin.
    echo "vercel-build: development build → VITE_API_URL unset (same-origin/proxy)"
    ;;
esac

npm ci
npm run build
npm --prefix admin ci
npm --prefix admin run build
rm -rf dist/admin
mv admin/dist dist/admin
