import { PrismaClient } from "@prisma/client";

// Check if we're in test mode
const isTestEnvironment = process.env["NODE_ENV"] === "test";

// Configuration options
const config = isTestEnvironment
  ? {
      datasources: {
        db: {
          url: "postgresql://jonathanhapp@localhost:5432/concert_poster_marketplace_test",
        },
      },
      log: [
        { level: "error" as const, emit: "stdout" as const },
        { level: "warn" as const, emit: "stdout" as const },
      ],
    }
  : undefined;

// Create the appropriate Prisma client
const prisma = isTestEnvironment
  ? new PrismaClient(config)
  : new PrismaClient();

// Log which database we're connecting to (for debugging)
const dbUrl = isTestEnvironment
  ? "concert_poster_marketplace_test"
  : process.env["DATABASE_URL"] || "default database";

console.log(
  `[Prisma] Connecting to ${
    isTestEnvironment ? "TEST" : "PRODUCTION"
  } database: ${dbUrl}`
);

export default prisma;
