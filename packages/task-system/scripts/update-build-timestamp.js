#!/usr/bin/env node

/**
 * Writes a build timestamp into dist/ so the host can confirm fresh package output.
 *
 * IMPORTANT:
 * - Do NOT write into tracked files (like package.json) during builds.
 *   This creates perpetual "dirty working tree" behavior for contributors and CI.
 * - dist/ is already gitignored, so this stays local/build-output only.
 */

const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");
const outPath = path.join(distDir, "build-timestamp.json");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const buildTimestamp = new Date().toISOString();
fs.writeFileSync(outPath, JSON.stringify({ buildTimestamp }, null, 2) + "\n");

console.log(`✅ Wrote build timestamp: ${buildTimestamp}`);
