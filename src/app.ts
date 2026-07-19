import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';

import config from './config';
import { ApplicationRouters } from './routes';
import globalErrorHandler from './middleware/globalErrorHandler';
import passport from 'passport';

const app: Application = express();

/**
 * Allowed domains for CORS
 */
const allowedURL = [
  config.admin_client_url,
  config.frontend_url,
  'http://192.168.68.120:3017',
  'http://192.168.68.107:3017',
  'https://sandbox.sslcommerz.com',
  'https://securepay.sslcommerz.com',
];

// More permissive CORS - allow all origins but still track credentials
// Payment callback URLs from SSLCommerz need to work cross-origin
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, redirects, etc.)
      // Allow all configured URLs
      // Allow any origin (needed for SSLCommerz payment callbacks)
      callback(null, true);
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
