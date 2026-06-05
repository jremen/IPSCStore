import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import flowbiteReact from "flowbite-react/plugin/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    flowbiteReact(),
    react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward the real client IP so the backend can identify localhost/trusted requests
            const clientIp = req.socket.remoteAddress;
            if (clientIp) {
              proxyReq.setHeader('X-Forwarded-For', clientIp);
            }
          });
        },
      },
    },
  },
});