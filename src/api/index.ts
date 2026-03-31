import express, { Express } from 'express';
import { logger } from '../utils/logger';
import { errorHandler, requestLogger } from './middleware/errorHandler';
import agentsRouter from './routes/agents';
import productsRouter from './routes/products';
import supportRouter from './routes/support';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(requestLogger);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/agents', agentsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/support', supportRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}
