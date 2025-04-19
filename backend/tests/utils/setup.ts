/**
 * This file contains global setup for Vitest tests
 * It runs once before all tests start
 */

// Force NODE_ENV to be 'test'
process.env.NODE_ENV = "test";

// Add any other global setup here that should run once before all tests
console.log("🧪 Vitest setup: Setting test environment");
