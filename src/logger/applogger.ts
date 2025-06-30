

import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log directory and file paths
const logDir = path.join(process.cwd(), 'logs');

// Define log formats
const { combine, timestamp, printf, colorize } = winston.format;

// Add custom colors for log levels
winston.addColors({
  info: 'green',
  error: 'red',
});

// Custom log format
const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let levelLabel = '';
  if (level.toLowerCase().includes('info')) {
    levelLabel = 'INFO';
  } else if (level.toLowerCase().includes('error')) {
    levelLabel = 'ERROR';
  } else {
    levelLabel = level.toUpperCase();
  }
  const metaString = Object.keys(metadata).length
    ? `\n${JSON.stringify(metadata, null, 2)}`
    : '';

  return `${timestamp} [${levelLabel}]: ${message}${metaString}`;
});

// Define transports array
const transports = [];

const infoTransport = new DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info', // Log info and above (includes error)
});
transports.push(infoTransport);
const errorTransport = new DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error', // Log error and above
});
transports.push(errorTransport);

// Console transport 
const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat,
  ),
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info', // Log debug in development, info in production
}); 
transports.push(consoleTransport);

// Create logger
const AppLogger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    myFormat,
  ),
  transports: transports,
});

export default AppLogger;
