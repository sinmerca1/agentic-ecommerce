import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger';
import { AgentError } from '../../utils/errors';

export function errorHandler(
  error: Error | AgentError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Request error:', error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors,
    });
  }

  if (error instanceof AgentError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error instanceof Error ? error.message : String(error),
  });
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}
