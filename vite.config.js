import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    cssMinify: true,
    reportCompressedSize: true,
  },
  // Allow tunnel hostnames (cloudflared/ngrok) in dev and preview.
  server: {
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
