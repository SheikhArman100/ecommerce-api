import { Server } from 'http';

import app from './app';
import config from './config/index';
import { prisma } from './client';

let server: Server;

/**
 * Connect MySQL with Prisma and start API server
 */
async function main(): Promise<void> {
  try {
    // Connect to MySQL using Prisma
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database health check passed');

    server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    await gracefulShutdown(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(exitCode: number = 0): Promise<void> {
  console.log('🔄 Starting graceful shutdown...');
  
  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('✅ HTTP server closed');
          resolve();
        });
      });
    }

    // Disconnect from database
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
    
    console.log('✅ Graceful shutdown completed');
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Setup process event handlers
 */
function setupProcessHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown(1);
  });

  // Handle SIGTERM (e.g., from Docker, Kubernetes)
  process.on('SIGTERM', () => {
    console.log('📨 SIGTERM received');
    gracefulShutdown(0);
  });

  // Handle SIGINT (e.g., Ctrl+C)
  process.on('SIGINT', () => {
    console.log('📨 SIGINT received');
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
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

// Start the application
start();