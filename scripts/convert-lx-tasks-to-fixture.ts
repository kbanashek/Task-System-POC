#!/usr/bin/env ts-node
/**
 * CLI tool to convert LX task JSON files into task-system fixtures.
 *
 * Usage:
 *   node scripts/convert-lx-tasks-to-fixture.ts \
 *     --input path/to/lx-tasks.json \
 *     --output packages/task-system/src/fixtures/lx-production-tasks.json \
 *     --study-version "1.0" \
 *     --fixture-id "lx-production-2025-01-20"
 */

import * as fs from "fs";
import * as path from "path";
import { lxToTaskSystemAdapter } from "../packages/task-system/src/utils/lxToTaskSystemAdapter";
import type { LXGetTasksResponse } from "../packages/task-system/src/utils/lxToTaskSystemAdapter";

interface CliOptions {
  input: string;
  output: string;
  studyVersion?: string;
  studyStatus?: string;
  fixtureId?: string;
  pretty?: boolean;
}

/**
 * Parse command line arguments
 */
const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--input":
      case "-i":
        options.input = nextArg;
        i++;
        break;
      case "--output":
      case "-o":
        options.output = nextArg;
        i++;
        break;
      case "--study-version":
      case "-v":
        options.studyVersion = nextArg;
        i++;
        break;
      case "--study-status":
      case "-s":
        options.studyStatus = nextArg;
        i++;
        break;
      case "--fixture-id":
      case "-f":
        options.fixtureId = nextArg;
        i++;
        break;
      case "--pretty":
      case "-p":
        options.pretty = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  if (!options.input || !options.output) {
    console.error("Error: --input and --output are required\n");
    printHelp();
    process.exit(1);
  }

  return options as CliOptions;
};

/**
 * Print help message
 */
const printHelp = (): void => {
  console.log(`
LX Task JSON to Task-System Fixture Converter

Usage:
  node scripts/convert-lx-tasks-to-fixture.ts [options]

Options:
  -i, --input <file>          Input LX task JSON file (required)
  -o, --output <file>         Output fixture JSON file (required)
  -v, --study-version <ver>   Study version (default: "1.0")
  -s, --study-status <status> Study status (default: "LIVE")
  -f, --fixture-id <id>       Fixture identifier (default: auto-generated)
  -p, --pretty                Pretty-print output JSON (default: false)
  -h, --help                  Show this help message

Examples:
  # Basic conversion
  node scripts/convert-lx-tasks-to-fixture.ts \\
    --input lx-tasks.json \\
    --output packages/task-system/src/fixtures/lx-production-tasks.json

  # With all options
  node scripts/convert-lx-tasks-to-fixture.ts \\
    --input lx-tasks.json \\
    --output fixtures/lx-tasks.json \\
    --study-version "2.5" \\
    --study-status "BUILD" \\
    --fixture-id "lx-prod-2025-01-20" \\
    --pretty

Input Format:
  The input file should be the raw GraphQL response from LX's getTasks API:
  {
    "data": {
      "getTasks": [
        {
          "date": "2025-01-20",
          "dayOffset": 0,
          "tasks": [
            { "pk": "...", "sk": "...", "title": "...", ... }
          ]
        }
      ]
    }
  }

Output Format:
  The output will be a TaskSystemFixture JSON file ready for import:
  {
    "version": 1,
    "fixtureId": "...",
    "activities": [],
    "tasks": [...],
    "questions": []
  }
`);
};

/**
 * Read and parse JSON file
 */
const readJsonFile = (filePath: string): LXGetTasksResponse => {
  try {
    const absolutePath = path.resolve(filePath);
    const content = fs.readFileSync(absolutePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error reading input file: ${error.message}`);
    } else {
      console.error(`Error reading input file: ${String(error)}`);
    }
    process.exit(1);
  }
};

/**
 * Write JSON to file
 */
const writeJsonFile = (
  filePath: string,
  data: unknown,
  pretty: boolean
): void => {
  try {
    const absolutePath = path.resolve(filePath);
    const dir = path.dirname(absolutePath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    fs.writeFileSync(absolutePath, content, "utf-8");
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error writing output file: ${error.message}`);
    } else {
      console.error(`Error writing output file: ${String(error)}`);
    }
    process.exit(1);
  }
};

/**
 * Validate LX response structure
 */
const validateLxResponse = (data: unknown): data is LXGetTasksResponse => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;
  if (!obj.data || typeof obj.data !== "object" || obj.data === null) {
    return false;
  }

  const dataObj = obj.data as Record<string, unknown>;
  if (!Array.isArray(dataObj.getTasks)) {
    return false;
  }

  return true;
};

/**
 * Generate fixture ID from current date if not provided
 */
const generateFixtureId = (): string => {
  const date = new Date().toISOString().split("T")[0];
  return `lx-tasks-${date}`;
};

/**
 * Main execution
 */
const main = (): void => {
  console.log("LX Task JSON to Task-System Fixture Converter\n");

  const options = parseArgs();

  console.log(`Input:  ${options.input}`);
  console.log(`Output: ${options.output}`);
  if (options.studyVersion)
    console.log(`Study Version: ${options.studyVersion}`);
  if (options.studyStatus) console.log(`Study Status: ${options.studyStatus}`);
  if (options.fixtureId) console.log(`Fixture ID: ${options.fixtureId}`);
  console.log();

  // Read input file
  console.log("Reading input file...");
  const lxResponse = readJsonFile(options.input);

  // Validate structure
  console.log("Validating input structure...");
  if (!validateLxResponse(lxResponse)) {
    console.error(
      "Error: Input file does not match expected LX getTasks response structure"
    );
    console.error("Expected: { data: { getTasks: [...] } }");
    process.exit(1);
  }

  // Count tasks
  const taskCount = lxResponse.data.getTasks.reduce(
    (sum, group) => sum + group.tasks.length,
    0
  );
  console.log(
    `Found ${taskCount} tasks in ${lxResponse.data.getTasks.length} date groups`
  );

  // Convert to fixture
  console.log("Converting to task-system fixture format...");
  const fixture = lxToTaskSystemAdapter(lxResponse, {
    studyVersion: options.studyVersion,
    studyStatus: options.studyStatus,
    fixtureId: options.fixtureId || generateFixtureId(),
  });

  // Write output file
  console.log("Writing output file...");
  writeJsonFile(options.output, fixture, options.pretty ?? false);

  console.log("\n✅ Conversion complete!");
  console.log(`   Tasks converted: ${fixture.tasks.length}`);
  console.log(`   Fixture ID: ${fixture.fixtureId || "(none)"}`);
  console.log(`   Output file: ${options.output}`);
  console.log("\nNext steps:");
  console.log("  1. Review the generated fixture file");
  console.log("  2. Import it using: await importTaskSystemFixture(fixture)");
  console.log("  3. Test rendering in the task-system UI");
};

// Run if executed directly
if (require.main === module) {
  main();
}

export { parseArgs, validateLxResponse, generateFixtureId };
