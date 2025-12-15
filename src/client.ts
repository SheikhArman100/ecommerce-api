import "dotenv/config";
import { PrismaClient } from "./generated/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import ApiError from "./errors/ApiError";
import prismaLogger from "./logger/prismaLogger";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new ApiError(500, 'DATABASE_URL environment variable is required');
}

const url = new URL(connectionString);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? Number(url.port) : undefined,
  user: url.username ? decodeURIComponent(url.username) : undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  database: url.pathname.slice(1) || undefined,
});

// Enable logging only in development
const isDevelopment = process.env.NODE_ENV !== 'production';

export const prisma = new PrismaClient({ 
  adapter,
  log: isDevelopment ? [
    { emit: "event", level: "query" },
    { emit: "event", level: "error" },
    { emit: "event", level: "info" },
    { emit: "event", level: "warn" },
  ] : [
    { emit: "event", level: "error" }, 
  ],
  transactionOptions: {
  maxWait: 60000,  // 1 minute
  timeout: 300000, // 5 minutes per transaction
}
});

// Error logging (both dev and prod)
prisma.$on("error", (err: any) => {
  const errorMessage = err instanceof Error ? err.stack ?? err.message : String(err);
  prismaLogger.error(`${errorMessage}`);
});

// Query logging (development only)
// if (isDevelopment) {
//   prisma.$on("query", (e: any) => {
//     prismaLogger.info(`query: ${e.query}`, {
//       duration: `${e.duration}ms`,
//       params: e.params
//     });
//   });

//   prisma.$on("info", (e: any) => {
//     prismaLogger.info(`${e.message}`);
//   });

//   prisma.$on("warn", (e: any) => {
//     prismaLogger.warn(`${e.message}`);
//   });
// }
