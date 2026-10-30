import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import documentRoutes from './routes/documentRoutes.ts';
import { documentController } from './controllers/documentController.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { notFoundHandler } from './middleware/notFound.ts';

export async function createApp(): Promise<Express> {
  const app = express();

  // Basic CORS configuration
  const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
  app.use(
    cors({
      origin: allowedOrigin,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsing for JSON and URL-encoded data
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Interactive Swagger UI documentation at /api-docs
  try {
    const openapiPath = path.resolve('server/openapi.yaml');
    const swaggerDocument = YAML.load(openapiPath);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'Document Vault API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    }));
  } catch (err) {
    console.warn('Warning: Could not load Swagger documentation:', err);
  }

  // Health endpoint
  app.get('/api/health', (req, res, next) => {
    documentController.health(req, res).catch(next);
  });

  // Document Management REST endpoints
  app.use('/api/documents', documentRoutes);

  // 404 handler for undefined API routes
  app.use('/api/*', notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
