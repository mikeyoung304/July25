import winston from 'winston';

// Access environment variables directly to avoid circular dependency with environment.ts
const LOG_LEVEL = process.env['LOG_LEVEL'] || 'info';
const LOG_FORMAT = process.env['LOG_FORMAT'] || 'json';
const NODE_ENV = process.env['NODE_ENV'] || 'development';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const simpleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: LOG_FORMAT === 'json' ? logFormat : simpleFormat,
  transports: [
    new winston.transports.Console(),
    // Add file transport for production
    ...(NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ] : []),
  ],
});

// Create a child logger for specific contexts
export function createLogger(context: string) {
  return logger.child({ context });
}