/**
 * Script to start Prisma Studio with the test database
 * This allows you to browse and edit data in your test database
 */

import { exec } from "child_process";

// Define the test database URL
const testDbUrl =
  "postgresql://jonathanhapp@localhost:5432/concert_poster_marketplace_test";

console.log("Starting Prisma Studio with test database...");
console.log(`Database URL: ${testDbUrl}`);

// Set environment variable and run Prisma Studio
const studio = exec(
  `DATABASE_URL="${testDbUrl}" npx prisma studio`,
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(stdout);
  }
);

// Forward stdout and stderr to console
studio.stdout.on("data", (data) => {
  console.log(data.toString());
});

studio.stderr.on("data", (data) => {
  console.error(data.toString());
});

// Handle process termination
process.on("SIGINT", () => {
  console.log("Stopping Prisma Studio...");
  studio.kill();
  process.exit(0);
});
