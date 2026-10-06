import { defineConfig } from 'vite';

const backend = { target: 'http://127.0.0.1:8000', changeOrigin: false };

export default defineConfig(({ command }) => ({
  // The production build is served by Django under /static/ (see fraudshield/settings.py).
  base: command === 'build' ? '/static/' : '/',
  build: { chunkSizeWarningLimit: 800 },
  server: {
    port: 5173,
    proxy: {
      '/accounts': backend,
      '/prediction': backend,
      '/analytics': backend,
      '/media': backend,
    },
  },
}));
