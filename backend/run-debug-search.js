#!/usr/bin/env node

// This is a wrapper script to run TypeScript files with ESM compatibility
// It uses your existing custom-loader.mjs file which is already set up for ESM+TypeScript

import { spawn } from "child_process";

// Run the debug script with the proper Node.js configuration
const nodeProcess = spawn(
  "node",
  [
    // Use your existing custom loader that handles TypeScript + ESM
    "--loader",
    "./custom-loader.mjs",
    // Enable ECMAScript modules
    "--experimental-specifier-resolution=node",
    // The debug script file to run
    "./src/debug-search-issue.ts",
  ],
  {
    stdio: "inherit",
    env: process.env,
  }
);

// Handle process events
nodeProcess.on("error", (err) => {
  console.error("Failed to start debug script:", err);
});

nodeProcess.on("close", (code) => {
  if (code !== 0) {
    console.log(`Debug script exited with code ${code}`);
  }
});
