import { Server } from 'http';

import app from './app';

import config from './config/index';
import AppLogger from './logger/applogger'; // <-- Add this import
import { prisma } from './client';

let server: Server;

/**
 * Connect MySQL with Prisma and start API server
 */
async function main(): Promise<void> {
  try {
    // Connect to MySQL using Prisma
    await prisma.$connect();
    AppLogger.info('✅ Database connected successfully');

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    AppLogger.info('✅ Database health check passed');

    server = app.listen(config.port, () => {
      AppLogger.info(`🚀 Server running on port ${config.port}`);
      AppLogger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    AppLogger.error('❌ Failed to start application:', { error });
    await gracefulShutdown(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(exitCode: number = 0): Promise<void> {
  AppLogger.info('🔄 Starting graceful shutdown...');
  
  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          AppLogger.info('✅ HTTP server closed');
          resolve();
        });
      });
    }

    // Disconnect from database
    await prisma.$disconnect();
    AppLogger.info('✅ Database disconnected');
    
    AppLogger.info('✅ Graceful shutdown completed');
    process.exit(exitCode);
  } catch (error) {
    AppLogger.error('❌ Error during shutdown:', { error });
    process.exit(1);
  }
}

/**
 * Setup process event handlers
 */
function setupProcessHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    AppLogger.error('❌ Unhandled Rejection at:', { promise, reason });
    gracefulShutdown(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    AppLogger.error('❌ Uncaught Exception:', { error });
    gracefulShutdown(1);
  });

  // Handle SIGTERM (e.g., from Docker, Kubernetes)
  process.on('SIGTERM', () => {
    AppLogger.info('📨 SIGTERM received');
    gracefulShutdown(0);
  });

  // Handle SIGINT (e.g., Ctrl+C)
  process.on('SIGINT', () => {
    AppLogger.info('📨 SIGINT received');
    gracefulShutdown(0);
  });
}

/**
 * Start the application
 */
async function start(): Promise<void> {
  try {
    setupProcessHandlers();
    await main();
  } catch (error) {
    AppLogger.error('❌ Error starting application:', { error });
    process.exit(1);
  }
}

// Start the application
start();