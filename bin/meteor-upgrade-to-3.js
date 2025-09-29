#!/usr/bin/env node

const path = require('path');
const { existsSync } = require('fs');

// Check if we're running from source or built
const srcPath = path.join(__dirname, '../src/cli.ts');
const distPath = path.join(__dirname, '../dist/cli.js');

if (existsSync(distPath)) {
  // Running from built version
  require(distPath);
} else if (existsSync(srcPath)) {
  // Running from source - use ts-node if available
  try {
    require('ts-node/register');
    require(srcPath);
  } catch (e) {
    console.error('Please run `npm run build` first or install ts-node for development.');
    process.exit(1);
  }
} else {
  console.error('CLI entry point not found. Please run `npm run build` first.');
  process.exit(1);
}