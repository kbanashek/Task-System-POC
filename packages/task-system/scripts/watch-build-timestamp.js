#!/usr/bin/env node

/**
 * Watches dist/ directory and writes a build timestamp when files change.
 *
 * NOTE: This intentionally does NOT modify tracked files (e.g. package.json),
 * so contributors don't end up with a perpetually dirty working tree.
 */

const fs = require("fs");
const path = require("path");

const distPath = path.join(__dirname, "..", "dist");
const timestampPath = path.join(distPath, "build-timestamp.json");

let lastUpdate = 0;
const DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before updating (prevent loops)
let updateTimeout = null;

function updateTimestamp() {
  const buildTimestamp = new Date().toISOString();
  fs.writeFileSync(
    timestampPath,
    JSON.stringify({ buildTimestamp }, null, 2) + "\n"
  );
  console.log(`✅ [watch] Wrote build timestamp: ${buildTimestamp}`);
}

function checkAndUpdate() {
  const now = Date.now();
  // Clear any pending update
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }

  // Only update if enough time has passed since last update
  if (now - lastUpdate > DEBOUNCE_MS) {
    updateTimestamp();
    lastUpdate = now;
  } else {
    // Debounce: schedule update for later
    updateTimeout = setTimeout(
      () => {
        const checkNow = Date.now();
        if (checkNow - lastUpdate > DEBOUNCE_MS) {
          updateTimestamp();
          lastUpdate = checkNow;
        }
        updateTimeout = null;
      },
      DEBOUNCE_MS - (now - lastUpdate)
    );
  }
}

// Watch dist directory recursively
console.log(`👀 Watching ${distPath} for changes...`);
fs.watch(distPath, { recursive: true }, (eventType, filename) => {
  // Only react to actual build output changes, not our own timestamp file.
  if (filename && filename.includes("build-timestamp.json")) return;

  if (filename && (filename.endsWith(".js") || filename.endsWith(".d.ts"))) {
    // Ignore if it's the index.js we just touched (avoid loop)
    if (filename === "index.js" && eventType === "change") {
      // Check if this is a real change or just our touch
      // We'll let it through but debounce will handle it
    }
    checkAndUpdate();
  }
});

// Initial timestamp
updateTimestamp();
