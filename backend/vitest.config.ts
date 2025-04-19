import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Run tests sequentially
    sequence: {
      concurrent: false, // Disable concurrent test execution
      shuffle: false, // Disable random test shuffling
    },
    // Increase timeout for database operations
    testTimeout: 60000, // 60 seconds
    hookTimeout: 60000, // 60 seconds for hooks
    // If you have setup files
    setupFiles: ["./tests/utils/setup.ts"],
    // Show detailed output for better debugging
    reporters: ["verbose"],
    // Environment configuration
    environment: "node",
    // Only include files matching these patterns
    include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // Add retry logic for flaky tests
    // Use stable snapshots
    snapshotFormat: {
      printBasicPrototype: true,
    },
    // Global teardown to ensure all resources are cleaned up
    // Move teardown logic to setupFiles or handle it manually in tests
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
