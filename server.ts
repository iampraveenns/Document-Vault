import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createApp } from './server/src/app.ts';
import { connectDB } from './server/src/config/database.ts';

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  try {
    await connectDB();
    const app = await createApp();

    // In production, serve Vite build output from dist/
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));

    // Fallback to index.html for SPA routing (except /api routes)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/api-docs')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Document Vault full-stack server running on http://localhost:${PORT}`);
      console.log(`Swagger documentation: http://localhost:${PORT}/api-docs`);
    });

    const shutdown = async () => {
      console.log('Shutting down server...');
      server.close(async () => {
        const { disconnectDB } = await import('./server/src/config/database.ts');
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();
