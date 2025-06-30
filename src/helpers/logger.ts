import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Custom format for better readability
const customFormat = winston.format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    const formattedMessage = `${timestamp} ${level.toUpperCase()}: ${message}`;

    // Pretty print the metadata
    if (Object.keys(metadata).length) {
      const prettyMetadata = JSON.stringify(metadata, null, 2);
      return `${formattedMessage}\nMetadata:\n${prettyMetadata}\n`;
    }

    return formattedMessage;
  }
);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', '%DATE%-error.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json({ space: 2 })
      ),
    }),
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', '%DATE%-app.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json({ space: 2 }),
        winston.format.printf((info) => {
          if (info.level === 'error') return '';
          return JSON.stringify(info, null, 2);
        })
      ),
      level: 'info',
    }),
  ],
});

// Add console transport in development with colorization
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        customFormat
      ),
    })
  );
}

export default logger;