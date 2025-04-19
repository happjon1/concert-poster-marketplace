import { PrismaClient } from "@prisma/client";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import * as dotenv from "dotenv";

// Explicitly load test environment variables first, followed by default environment variables
dotenv.config({ path: join(__dirname, "../../.env.test") });
dotenv.config(); // Also load default .env as fallback

// Set the NODE_ENV to 'test' explicitly
process.env.NODE_ENV = "test";

const execPromise = promisify(exec);

// Path to main schema (instead of test schema)
const SCHEMA_PATH = join(__dirname, "../../prisma/schema.prisma");

// Use a completely separate test database for isolation
// We use the same PostgreSQL user, but with a dedicated test database name
const testDbName = "concert_poster_marketplace_test";
const testDatabaseUrl = `postgresql://jonathanhapp@localhost:5432/${testDbName}`;

// CRITICAL: Override DATABASE_URL globally for ALL Prisma instances
process.env.DATABASE_URL = testDatabaseUrl;

// Log the database URL so we can see which database is being used
console.log(`Using dedicated test database: ${testDatabaseUrl}`);

// Create a singleton PrismaClient with specific configuration for tests
// Add connection pool settings to prevent connection issues
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl,
    },
  },
  log: ["error", "warn"],
  // Add explicit connection options for more stability
  // This helps prevent connection pool exhaustion in test environments
  // Removed __internal block as it is not a valid PrismaClient configuration option
});

// Track database connection state
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

// Ensure database is properly connected before any operations
async function ensureConnection() {
  if (isConnected) return;

  if (!connectionPromise) {
    connectionPromise = (async () => {
      try {
        // Test the connection with a simple query
        await prisma.$executeRaw`SELECT 1;`;
        isConnected = true;
        console.log("Database connection established successfully");
      } catch (error) {
        console.error("Failed to connect to database:", error);
        throw error;
      } finally {
        connectionPromise = null;
      }
    })();
  }

  return connectionPromise;
}

// Function to install the pg_trgm extension if needed
async function setupPgTrgmExtension() {
  try {
    await ensureConnection();
    console.log("Attempting to set up pg_trgm extension...");

    // Try to create the extension
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
      console.log("Successfully created pg_trgm extension");
    } catch (error) {
      console.warn(
        "Warning: Could not create pg_trgm extension:",
        error.message
      );
    }

    // Test if the extension is working by adding explicit type casts
    try {
      const result =
        await prisma.$queryRaw`SELECT similarity('test'::text, 'test'::text) as sim;`;
      console.log("pg_trgm test successful:", result);
      return true;
    } catch (error) {
      console.warn("pg_trgm similarity function not available:", error.message);
      return false;
    }
  } catch (error) {
    console.error("Error setting up pg_trgm extension:", error);
    return false;
  }
}

// Function to run Prisma migrations for the test database
async function runPrismaMigrations() {
  try {
    console.log(`Running Prisma migrations for test database...`);

    // Force disconnect to make sure we don't have connection conflicts during migration
    await prisma.$disconnect();

    // Apply migrations using the main schema file but with TEST_DATABASE_URL
    const { stdout: applyStdout, stderr: applyStderr } = await execPromise(
      `cd ${join(
        __dirname,
        "../../"
      )} && DATABASE_URL="${testDatabaseUrl}" npx prisma migrate deploy --schema=${SCHEMA_PATH}`
    );

    if (applyStderr && !applyStderr.includes("already in sync")) {
      console.error("Error applying migrations:", applyStderr);
    } else {
      console.log("Migrations applied successfully:", applyStdout);
    }

    // Reconnect after migration
    isConnected = false;
    await ensureConnection();

    // Try to set up the pg_trgm extension
    await setupPgTrgmExtension();
  } catch (error) {
    console.error("Failed to run Prisma migrations:", error);
    throw error;
  }
}

// Function to ensure the test database exists
async function ensureTestDatabaseExists() {
  try {
    console.log(`Ensuring test database ${testDbName} exists...`);

    // Connect to the postgres database to create the test database if needed
    const { stdout, stderr } = await execPromise(
      `psql -d postgres -c "SELECT 1 FROM pg_database WHERE datname='${testDbName}'" | grep -q 1 || psql -d postgres -c "CREATE DATABASE ${testDbName}"`
    );

    if (stderr) {
      console.error("Error checking/creating database:", stderr);
    }

    return true;
  } catch (error) {
    console.error("Error ensuring test database exists:", error);
    return false;
  }
}

// Mutex implementation for database operations
class Mutex {
  private isLocked = false;
  private queue: Array<(value: void | PromiseLike<void>) => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next(undefined);
    } else {
      this.isLocked = false;
    }
  }
}

const databaseMutex = new Mutex();

// Function to clear all data from the test database
async function clearAllData() {
  // Acquire lock to prevent concurrent table truncation
  await databaseMutex.acquire();

  try {
    console.log("Clearing all data from test database...");
    await ensureConnection();

    // Disable foreign key checks
    await prisma.$executeRaw`SET session_replication_role = 'replica';`;

    // Get all tables in the public schema
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN ('_prisma_migrations', 'pg_stat_statements')
    `;

    // Truncate each table
    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE "${tablename}" CASCADE;`
        );
        console.log(`Truncated table: ${tablename}`);
      } catch (truncateError) {
        console.error(`Error truncating ${tablename}:`, truncateError);
      }
    }

    // Re-enable foreign key checks
    await prisma.$executeRaw`SET session_replication_role = 'origin';`;

    return true;
  } catch (error) {
    console.error("Error clearing test data:", error);
    return false;
  } finally {
    // Always release the lock
    databaseMutex.release();
  }
}

// Use a single database reset flag to prevent concurrent resets
let isResetting = false;
let resetQueue: Array<() => void> = [];

// Function to reset and initialize the test database between test runs
export async function resetDatabase() {
  // If reset is already in progress, wait for it to complete
  if (isResetting) {
    console.log("Database reset already in progress, waiting...");
    await new Promise<void>((resolve) => {
      resetQueue.push(resolve);
    });
    return prisma;
  }

  try {
    isResetting = true;

    // Make sure the test database exists
    await ensureTestDatabaseExists();

    // Run the migrations to ensure schema is up to date
    await runPrismaMigrations();

    // Clear all data from the database with retry mechanism
    let retries = 0;
    let success = false;

    while (!success && retries < 3) {
      try {
        await clearAllData();
        success = true;
      } catch (error) {
        retries++;
        console.error(`Database clear attempt ${retries} failed:`, error);

        // Wait before retrying
        if (retries < 3) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (!success) {
      throw new Error("Failed to clear database after multiple attempts");
    }

    // Verify the database is empty
    const posterCount = await prisma.poster.count();
    console.log(`Poster count after reset: ${posterCount}`);

    if (posterCount > 0) {
      console.warn(
        `Warning: Database still contains ${posterCount} posters after reset!`
      );
    }

    return prisma;
  } catch (error) {
    console.error("Failed to reset database:", error);
    throw error;
  } finally {
    isResetting = false;

    // Notify waiting callers that reset is complete
    if (resetQueue.length > 0) {
      const nextInQueue = resetQueue.shift();
      if (nextInQueue) nextInQueue();
    }
  }
}

// Improved transaction handling for test environment
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  await ensureConnection();
  let result: T;

  try {
    // Start a transaction
    await prisma.$executeRaw`BEGIN`;

    // Execute the function within the transaction
    result = await fn();

    // Commit the transaction
    await prisma.$executeRaw`COMMIT`;

    return result;
  } catch (error) {
    // Rollback on error
    try {
      await prisma.$executeRaw`ROLLBACK`;
    } catch (rollbackError) {
      console.error("Transaction rollback failed:", rollbackError);
    }

    console.error("Transaction error:", error);
    throw error;
  }
}

// Function to verify database configuration
export async function verifyDatabaseConfig() {
  try {
    await ensureConnection();

    // Basic connection test
    const connectionTest = await prisma.$queryRaw`SELECT 1 as connection_test;`;
    console.log("Database connection successful:", connectionTest);

    // Test pg_trgm if available
    try {
      const similarityTest = await prisma.$queryRaw`
        SELECT similarity('phish'::text, 'phsh'::text) as sim;
      `;
      console.log("pg_trgm similarity test:", similarityTest);

      return {
        success: true,
        message:
          "Database configuration verified successfully with pg_trgm support",
        hasPgTrgm: true,
      };
    } catch (trgmError) {
      console.warn("pg_trgm not available:", trgmError.message);

      return {
        success: true,
        message:
          "Database configuration verified but pg_trgm extension is not available",
        hasPgTrgm: false,
      };
    }
  } catch (error) {
    console.error("Database configuration error:", error);
    return {
      success: false,
      message: `Database configuration error: ${error.message}`,
      hasPgTrgm: false,
    };
  }
}

// Properly close database connections when Node process exits
process.on("beforeExit", async () => {
  console.log("Closing database connections before exit");
  await prisma.$disconnect();
});

// Export the test client
export default prisma;
