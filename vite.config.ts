import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { createApp } from './server/src/app.ts';
import { connectDB } from './server/src/config/database.ts';

function expressBackendPlugin(): Plugin {
  return {
    name: 'express-backend',
    async configureServer(server) {
      try {
        await connectDB();
        const app = await createApp();
        server.middlewares.use(app);
      } catch (err) {
        console.error('Failed to initialize Express backend in Vite dev server:', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
