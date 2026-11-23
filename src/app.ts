import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import config from './config';
import { ApplicationRouters } from './routes';
import globalErrorHandler from './middleware/globalErrorHandler';
import passport from 'passport';

const app: Application = express();

// Security headers (nosniff, frameguard, etc.)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

/**
 * Allowed domains for CORS
 */
const allowedOrigins: string[] = [
  config.admin_client_url,
  config.frontend_url,
  'http://localhost:3000',
  'http://localhost:3010',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3010',
  'http://192.168.68.120:3017',
  'http://192.168.68.107:3017',
  'https://sandbox.sslcommerz.com',
  'https://securepay.sslcommerz.com',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Allow requests with no origin or string "null"
      // (origin is null or "null" during server-to-server IPN, curl, or cross-origin form POST redirects from payment gateways like SSLCommerz)
      if (!origin || origin === 'null') {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      // 2. Allow any localhost or 127.0.0.1 port for local development
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(
        normalizedOrigin,
      );

      // 3. Allow explicitly configured origins (frontend, admin, payment gateways)
      const isAllowed =
        isLocalhost ||
        allowedOrigins.some(
          allowed => allowed.replace(/\/$/, '') === normalizedOrigin,
        );

      if (isAllowed) {
        return callback(null, true);
      }

      // Disallow origin gracefully without throwing an unhandled 500 exception
      return callback(null, false);
    },
    credentials: true,
  }),
);

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy to get the correct client IP
app.set('trust proxy', true);

app.use(passport.initialize());

/**
 * Health Check Endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to E-Commerce API Server',
  });
});

/**
 * Static file serving for local storage
 */
app.use('/file', express.static('uploads'));

/**
 * API Routes
 */
app.use('/api/v1', ApplicationRouters);

/**
 * Handle 404 Errors
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
    errorMessage: {
      path: req.originalUrl,
      message: 'API not found! Invalid URL or route.',
    },
  });
});

/**
 * Global Error Handler Middleware
 */
app.use(globalErrorHandler);

export default app;
