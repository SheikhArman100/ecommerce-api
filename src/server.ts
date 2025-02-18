import { Server } from 'http';

import app from './app';
import config from './config/index';
import { prisma } from './client';



let server: Server;

/**
 * connect MySQL with Prisma and API
 */
async function main() {
  try {
    // Connect to MySQL using Prisma
    await prisma.$connect();
    console.log('Database is successfully connected');

    server = app.listen(config.port, () => {
      console.log(`Application listening on port ${config.port}`);
    });
  } catch (error) {
    console.log(`Failed to connect to database, ${error}`);
  }

  process.on('unhandledRejection', error => {
    if (server) {
      server.close(() => {
        console.log(error);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

const start = async (): Promise<void> => {
  await main();
};

start().catch(err => console.error('Error starting application:', err));
