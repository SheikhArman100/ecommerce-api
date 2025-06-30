import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = path.join(process.cwd(), 'logs');
const { combine, timestamp, printf, colorize } = winston.format;

winston.addColors({ error: 'red' });

const errorFormat = printf(({ message, timestamp, ...metadata }) => {
  const metaString = Object.keys(metadata).length
    ? `\n${JSON.stringify(metadata, null, 2)}`
    : '';
  return `${timestamp} [ERROR]: ${message}${metaString}`;
});

const transports = [
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errorFormat
    ),
  }),
  new winston.transports.Console({
    level: 'error',
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errorFormat
    ),
  })
];

const ErrorLogger = winston.createLogger({
  level: 'error',
  transports,
});

export default ErrorLogger;