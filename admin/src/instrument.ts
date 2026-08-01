/**
 * Error tracking for the admin app. The office app and DriverOS already wire
 * Sentry; the admin app — used for the highest-privilege actions in the system
 * (suspending organisations, creating privileged users) — had none, so an
 * uncaught render error produced a blank screen with no telemetry. Mirrors
 * src/instrument.ts exactly: imported first in main.tsx, VITE_SENTRY_DSN is a
 * build-time env var, and an unset DSN is a safe, fully-supported no-op until a
 * real Sentry project exists.
 */
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || undefined,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
