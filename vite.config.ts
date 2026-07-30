import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Set HTTPS=true to serve the dev server over a self-signed TLS cert — needed
// to exercise the PWA / service worker / push on a real device, since those
// only activate in a "secure context" (HTTPS or localhost). See the run guide
// in 07-FleetHQ/FleetHQ_Overview.md. Combine with `--host` (npm run dev:lan)
// to make it reachable from a tablet/phone on the same WiFi.
const useHttps = process.env.HTTPS === 'true';

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(useHttps ? [basicSsl()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split ONLY the long-lived, app-wide core libs out of the entry bundle
        // so a normal app change doesn't force clients to re-download them.
        // Everything else returns undefined so Rollup keeps route-only deps
        // (Leaflet, etc.) inside their own React.lazy route chunk — a catch-all
        // "vendor" chunk would wrongly pull those into the eager first load.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('@tanstack')) return 'vendor-query';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          return undefined;
        },
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      // Same-origin in the browser during dev, so cookies/headers behave the
      // same way they will in production — the API itself still enforces
      // everything (12-API/API_Architecture.md: no privileged internal path).
      '/v1': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
