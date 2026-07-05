import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The v0/Vercel preview watches the port defined by DEV_PORT (defaults to 8000).
// Vite must listen on that port so the preview renders the UI, while the FastAPI
// backend runs on a separate internal port and is reached via the proxy below.
const previewPort = Number(process.env.DEV_PORT) || 8000;
const backendPort = Number(process.env.BACKEND_PORT) || 8001;
const backendTarget = `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: previewPort,
    strictPort: true,
    proxy: {
      '/health': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (path) => path
      },
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
});
