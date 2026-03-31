import pino from 'pino';
import { config } from '../config';

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
});

export const logger = pino(
  {
    level: config.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  config.NODE_ENV === 'production' ? undefined : transport
);

export const createChild = (context: Record<string, any>) =>
  logger.child(context);
