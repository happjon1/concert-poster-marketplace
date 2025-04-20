import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Run tests sequentially to prevent database race conditions
    sequence: {
      hooks: "list", // Run hooks in sequence order
    },
    testTimeout: 30000, // Increase timeout to 30 seconds
    poolOptions: {
      threads: {
        singleThread: true, // Force single-threaded mode
      },
    },
    // Retry failed tests only once
    retry: 1,
    // If you have setup files
    setupFiles: ["./tests/utils/setup.ts"],
    // Show detailed output for better debugging
    reporters: ["verbose"],
    // Environment configuration
    environment: "node",
    // Only include files matching these patterns
    include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // Use stable snapshots
    snapshotFormat: {
      printBasicPrototype: true,
    },
    // Improved error handling
    onConsoleLog(log, type) {
      // Filter out noisy logs if needed
      if (log.includes("prisma:info") || log.includes("prisma:debug")) {
        return false;
      }
      return true;
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
