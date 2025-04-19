import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Run tests sequentially instead of in parallel
    sequence: {
      sequential: true,
    },
    // Increase timeout for longer tests if needed
    testTimeout: 30000,
    // If you have setup files
    setupFiles: ["./tests/utils/setup.ts"],
    // Show detailed output for better debugging
    reporters: ["verbose"],
    // Environment configuration
    environment: "node",
    // Only include files matching these patterns
    include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
