import { Request, Response, NextFunction } from 'express';
import { authService } from '../../services/auth';
import { logger } from '../../utils/logger';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: 'admin' | 'operator';
      };
      token?: string;
    }
  }
}

/**
 * Middleware to verify authentication token
 * Token can be passed via:
 * 1. Authorization header: "Bearer <token>"
 * 2. Cookie: "authToken=<token>"
 * 3. Query parameter: "?token=<token>" (for SSE only)
 */
export function verifyAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from various sources
    let token: string | undefined;

    // 1. Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // 2. Cookie
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'authToken') {
          token = value;
          break;
        }
      }
    }

    // 3. Query parameter (only for SSE)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      logger.warn(`❌ Unauthorized access attempt - no token: ${req.ip} ${req.method} ${req.path}`);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token required',
      });
      return;
    }

    // Verify token
    const user = authService.verifyToken(token);
    if (!user) {
      logger.warn(`❌ Unauthorized access attempt - invalid token: ${req.ip} ${req.method} ${req.path}`);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    req.token = token;

    logger.debug(`✅ Auth verified for: ${user.username}`);
    next();
  } catch (error) {
    logger.error('Auth verification error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication verification failed',
    });
  }
}

/**
 * Middleware to verify admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    logger.warn(`❌ Forbidden - insufficient permissions: ${req.user.username}`);
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin role required',
    });
    return;
  }

  next();
}

/**
 * Middleware for rate limiting login attempts
 */
const loginAttempts: Map<string, { count: number; resetTime: number }> = new Map();
const ATTEMPT_LIMIT = 10;
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export function rateLimitLogin(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const attempts = loginAttempts.get(ip);

  if (attempts && now < attempts.resetTime) {
    if (attempts.count >= ATTEMPT_LIMIT) {
      logger.warn(`⚠️  Rate limit exceeded for IP: ${ip}`);
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: Math.ceil((attempts.resetTime - now) / 1000),
      });
      return;
    }
    attempts.count++;
  } else {
    loginAttempts.set(ip, {
      count: 1,
      resetTime: now + ATTEMPT_WINDOW,
    });
  }

  next();
}

/**
 * Middleware to log all access
 */
export function auditLog(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const user = req.user?.username || 'anonymous';
    const isError = status >= 400;

    if (isError) {
      logger.warn(`[AUDIT] ${user} ${req.method} ${req.path} ${status} ${duration}ms`);
    } else {
      logger.debug(`[AUDIT] ${user} ${req.method} ${req.path} ${status} ${duration}ms`);
    }
  });

  next();
}
