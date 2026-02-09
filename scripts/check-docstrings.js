#!/usr/bin/env node

/**
 * Docstring Coverage Checker
 *
 * Validates that TypeScript/JavaScript files have sufficient JSDoc documentation.
 * Checks for documentation on:
 * - Exported functions
 * - Exported classes and their public methods
 * - Exported types and interfaces
 * - Exported constants and variables
 *
 * Threshold: 80% minimum coverage required
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const THRESHOLD = 80; // Minimum % of exports that must have docstrings
const PATTERNS = {
  // Match JSDoc comments (/** ... */)
  jsdoc: /\/\*\*[\s\S]*?\*\//g,

  // Match exported items that need documentation
  exportedFunction: /export\s+(async\s+)?function\s+(\w+)/g,
  exportedConst: /export\s+const\s+(\w+)/g,
  exportedClass: /export\s+class\s+(\w+)/g,
  exportedInterface: /export\s+interface\s+(\w+)/g,
  exportedType: /export\s+type\s+(\w+)/g,
  exportedArrowFunc:
    /export\s+const\s+(\w+)\s*[:=]\s*(?:\([^)]*\)|[^=]+)\s*=>/g,
};

/**
 * Get list of staged TypeScript/JavaScript files
 * @returns {string[]} Array of staged file paths
 */
function getStagedFiles() {
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
    });

    return output
      .split("\n")
      .filter(file => file.match(/\.(ts|tsx|js|jsx)$/))
      .filter(file => !file.includes("node_modules"))
      .filter(file => !file.includes(".test."))
      .filter(file => !file.includes(".spec."))
      .filter(file => !file.includes("__tests__"))
      .filter(file => !file.includes(".stories."))
      .filter(file => !file.includes(".d.ts"))
      .filter(fs.existsSync);
  } catch (error) {
    return [];
  }
}

/**
 * Check if an export has a JSDoc comment above it.
 *
 * Note: JSDoc blocks are often longer than 5 lines; we scan a larger window
 * above the export to avoid false negatives.
 *
 * @param {string} content - File content
 * @param {number} exportIndex - Index where the export statement starts
 * @returns {boolean} True if a complete JSDoc block is found within the lookback window
 */
function hasJSDocAbove(content, exportIndex) {
  // Look backwards from the export position to find JSDoc
  const beforeExport = content.substring(0, exportIndex);
  const lines = beforeExport.split("\n");

  // Check a generous window above the export for a complete JSDoc block.
  // This is intentionally bigger than most docblocks to reduce false negatives.
  const lookbackLines = lines.slice(-60).join("\n");
  const jsdocMatch = lookbackLines.match(/\/\*\*[\s\S]*?\*\//);

  return jsdocMatch !== null;
}

/**
 * Analyze a file for docstring coverage
 * @param {string} filePath - Path to the file to analyze
 * @returns {{coverage: number, documented: number, total: number, missing: string[]}}
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const exports = [];
  const documented = [];
  const seen = new Set();

  // Find all exports
  Object.entries(PATTERNS).forEach(([type, pattern]) => {
    if (type === "jsdoc") return;

    let match;
    const regex = new RegExp(pattern.source, "g");

    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || match[2];
      const hasDoc = hasJSDocAbove(content, match.index);

      // Avoid double-counting exports that match multiple patterns (e.g. exportedConst + exportedArrowFunc).
      const key = `${match.index}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      exports.push({ name, type, hasDoc, index: match.index });

      if (hasDoc) {
        documented.push(name);
      }
    }
  });

  const total = exports.length;
  const documentedCount = documented.length;
  const coverage = total === 0 ? 100 : (documentedCount / total) * 100;
  const missing = exports.filter(e => !e.hasDoc).map(e => e.name);

  return { coverage, documented: documentedCount, total, missing };
}

/**
 * Main function to check docstring coverage
 */
function main() {
  const files = getStagedFiles();

  if (files.length === 0) {
    console.log("ℹ️  No TypeScript/JavaScript files staged for commit.");
    process.exit(0);
  }

  console.log(`📝 Checking docstring coverage for ${files.length} file(s)...`);

  let totalExports = 0;
  let totalDocumented = 0;
  const failedFiles = [];

  files.forEach(file => {
    const result = analyzeFile(file);
    totalExports += result.total;
    totalDocumented += result.documented;

    if (result.total > 0 && result.coverage < THRESHOLD) {
      failedFiles.push({
        file,
        coverage: result.coverage,
        missing: result.missing,
      });
    }
  });

  const overallCoverage =
    totalExports === 0 ? 100 : (totalDocumented / totalExports) * 100;

  console.log(
    `\n📊 Overall Docstring Coverage: ${overallCoverage.toFixed(2)}%`
  );
  console.log(`   Documented: ${totalDocumented}/${totalExports} exports`);

  if (failedFiles.length > 0) {
    console.log(
      `\n❌ ${failedFiles.length} file(s) below ${THRESHOLD}% threshold:\n`
    );

    failedFiles.forEach(({ file, coverage, missing }) => {
      console.log(`   ${file}: ${coverage.toFixed(2)}%`);
      console.log(`   Missing JSDoc for: ${missing.join(", ")}\n`);
    });

    console.log(
      `💡 Tip: Add JSDoc comments (/** ... */) above exported functions, classes, and types.`
    );
    console.log(`💡 You can also run: @coderabbitai generate docstrings`);
    console.log(
      `💡 Or use --no-verify to skip this check (not recommended).\n`
    );

    process.exit(1);
  }

  if (overallCoverage < THRESHOLD) {
    console.log(
      `\n❌ Overall coverage ${overallCoverage.toFixed(2)}% is below ${THRESHOLD}% threshold.`
    );
    console.log(
      `💡 Please add JSDoc comments to your exported functions, classes, and types.\n`
    );
    process.exit(1);
  }

  console.log(
    `✅ Docstring coverage check passed! (${overallCoverage.toFixed(2)}%)\n`
  );
  process.exit(0);
}

main();
