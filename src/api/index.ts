import express, { Express } from 'express';
import { logger } from '../utils/logger';
import { errorHandler, requestLogger } from './middleware/errorHandler';
import agentsRouter from './routes/agents';
import productsRouter from './routes/products';
import supportRouter from './routes/support';
import controlRouter from './routes/control';

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
  app.use('/api/control', controlRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}
