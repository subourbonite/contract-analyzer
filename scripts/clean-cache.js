#!/usr/bin/env node

const { tmpdir } = require('os');
const { join } = require('path');
const { rm } = require('fs/promises');
const { existsSync } = require('fs');

async function cleanCache() {
  const cacheDir = join(tmpdir(), 'vite-cache', 'contract-analyzer');

  try {
    if (existsSync(cacheDir)) {
      await rm(cacheDir, { recursive: true, force: true });
      console.log(`✅ Vite cache cleaned from: ${cacheDir}`);
    } else {
      console.log(`ℹ️  No cache directory found at: ${cacheDir}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning cache: ${error.message}`);
    process.exit(1);
  }
}

cleanCache();
