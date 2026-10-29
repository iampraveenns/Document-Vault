import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.ts';
import { connectDB } from './config/database.ts';

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDB();
    const app = await createApp();

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Document Vault Server running on http://localhost:${PORT}`);
      console.log(`📄 Swagger UI documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`💓 Health check at http://localhost:${PORT}/api/health`);
    });

    const shutdown = async () => {
      console.log('Shutting down server gracefully...');
      server.close(async () => {
        const { disconnectDB } = await import('./config/database.ts');
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

startServer();
