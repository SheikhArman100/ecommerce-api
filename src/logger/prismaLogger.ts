import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = path.join(process.cwd(), 'logs');
const { combine, timestamp, printf, colorize } = winston.format;

// Add colors for database logging
winston.addColors({
  query: 'cyan',
  info: 'blue',
  warn: 'yellow',
  error: 'red',
});

// Database-focused log format
const prismaFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let levelLabel = '';
  switch (level.toLowerCase()) {
    case 'query':
      levelLabel = 'QUERY';
      break;
    case 'info':
      levelLabel = 'DB-INFO';
      break;
    case 'warn':
      levelLabel = 'DB-WARN';
      break;
    case 'error':
      levelLabel = 'DB-ERROR';
      break;
    default:
      levelLabel = level.toUpperCase();
  }

  const metaString = Object.keys(metadata).length
    ? `\n${JSON.stringify(metadata, null, 2)}`
    : '';

  return `${timestamp} [${levelLabel}]: ${message}${metaString}`;
});

// Transports for different log levels
const transports = [
  // All database logs to prisma file
  new DailyRotateFile({
    filename: path.join(logDir, 'prisma-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'query', // Log query and above (includes info, warn, error)
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      prismaFormat
    ),
  }),
  // Console transport (development only for queries, production for errors)
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'development' ? 'query' : 'error',
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      prismaFormat
    ),
  })
];

// Create Prisma logger
const prismaLogger = winston.createLogger({
  level: 'query',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    prismaFormat,
  ),
  transports: transports,
});

export default prismaLogger;
