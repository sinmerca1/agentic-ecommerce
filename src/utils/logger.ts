import pino from 'pino';
import { config } from '../config';

let transport;
if (config.NODE_ENV !== 'production') {
  try {
    transport = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    });
  } catch (error) {
    // Fallback if pino-pretty is not available
    transport = undefined;
  }
}

export const logger = pino(
  {
    level: config.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export const createChild = (context: Record<string, any>) =>
  logger.child(context);
