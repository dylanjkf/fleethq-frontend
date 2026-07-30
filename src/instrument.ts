/**
 * Error tracking — the FleetHQ half of the commercial-readiness review's "no
 * monitoring exists" finding. Imported first in main.tsx, same reasoning as
 * apps/api/src/instrument.ts. VITE_SENTRY_DSN is a build-time env var (Vite
 * bakes it into the bundle, unlike apps/api's runtime env var) — unset in
 * every environment until a real Sentry project exists, which is a safe,
 * fully-supported no-op per Sentry's own docs.
 */
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || undefined,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
