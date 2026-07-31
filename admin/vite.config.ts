import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Deployed at fleethq.online/admin, a subpath of the same origin/domain as
  // the sibling office-dashboard app in this repo (../) — see ../vercel.json
  // for the build/routing wiring that puts this app's output under /admin.
  // Vite exposes this as import.meta.env.BASE_URL, which router.tsx passes
  // to createBrowserRouter's `basename` so client-side routing agrees with it.
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5175,
    proxy: {
      // Same-origin in the browser during dev — the admin platform talks to
      // the same API process as the customer apps, just a different route
      // prefix (/v1/admin/*) and a completely separate guard chain server-side.
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
