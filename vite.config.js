import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Forward API + health checks to the backend so the browser only ever
      // talks to port 5173 (no separate 3002 port-forward needed).
      '/api':    { target: 'http://backend:3002', changeOrigin: true },
      '/health': { target: 'http://backend:3002', changeOrigin: true },
    },
    watch: {
      usePolling: true,
    },
  },
});
