import express, { Express } from 'express';
import { logger } from '../utils/logger';
import { errorHandler, requestLogger } from './middleware/errorHandler';
import agentsRouter from './routes/agents';
import productsRouter from './routes/products';
import supportRouter from './routes/support';
import controlRouter from './routes/control';
import authRouter from './routes/auth';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(requestLogger);

  // Health check (public)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public routes (no authentication required)
  app.use('/api/agents', agentsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/support', supportRouter);

  // Authentication routes
  app.use('/api/auth', authRouter);

  // Protected routes (authentication required)
  app.use('/api/control', controlRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}
