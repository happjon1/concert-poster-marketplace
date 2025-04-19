/**
 * This file contains global teardown for Vitest tests
 * It runs once after all tests complete
 */

import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// Create a separate PrismaClient to ensure we can disconnect properly
// even if the main client in test-db.ts has issues
const teardownPrisma = new PrismaClient();

export default async function () {
  console.log("🧹 Global teardown: Cleaning up test environment");

  try {
    // Disconnect from the database to release all connections
    await teardownPrisma.$disconnect();
    console.log("✅ Successfully disconnected from test database");

    // Kill any lingering database connections to prevent connection pool issues
    try {
      const dbName = "concert_poster_marketplace_test";
      await execPromise(`
        psql -d postgres -c "
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = '${dbName}'
          AND pid <> pg_backend_pid();"
      `);
      console.log("✅ Forcefully terminated stale database connections");
    } catch (error) {
      console.warn(
        "⚠️ Could not terminate database connections:",
        error.message
      );
    }
  } catch (error) {
    console.error("❌ Error during global teardown:", error);
  }

  // Give Node.js a moment to finish any cleanup
  await new Promise((resolve) => setTimeout(resolve, 500));
}
