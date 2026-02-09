#!/usr/bin/env node

/**
 * Script to delete duplicate records from AppSync backend.
 * Keeps only the most recent record for each unique identifier (pk or pk+sk).
 * Handles Tasks, Activities, Questions, and Appointments.
 */

const https = require("https");
const path = require("path");

// Read aws-exports.js
const awsExportsPath = path.join(__dirname, "..", "aws-exports.js");
delete require.cache[require.resolve(awsExportsPath)];
const awsExports = require(awsExportsPath).default;

const endpoint = awsExports.aws_appsync_graphqlEndpoint;
const apiKey = awsExports.aws_appsync_apiKey;
const url = new URL(endpoint);

function graphqlRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          if (response.errors) {
            reject(new Error(JSON.stringify(response.errors)));
          } else {
            resolve(response.data);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function clearDuplicates(modelName, listQueryName, listQuery, getKeyFn) {
  console.log(`\n🔍 Fetching all ${modelName} from AppSync...`);

  const data = await graphqlRequest(listQuery);
  const items = data[listQueryName].items;

  console.log(`📋 Found ${items.length} total ${modelName.toLowerCase()}`);

  // Group by key (pk, or pk+sk, etc.)
  const itemsByKey = new Map();
  for (const item of items) {
    const key = getKeyFn(item);
    if (!itemsByKey.has(key)) {
      itemsByKey.set(key, []);
    }
    itemsByKey.get(key).push(item);
  }

  // Find duplicates (key with more than 1 item)
  const duplicates = Array.from(itemsByKey.entries())
    .filter(([key, items]) => items.length > 1)
    .map(([key, items]) => {
      // Sort by _lastChangedAt descending, keep the most recent
      const sorted = items.sort((a, b) => b._lastChangedAt - a._lastChangedAt);
      const keep = sorted[0];
      const toDelete = sorted.slice(1);

      return { key, keep, toDelete };
    });

  if (duplicates.length === 0) {
    console.log(`✅ No duplicate ${modelName.toLowerCase()} found!`);
    return 0;
  }

  console.log(
    `\n⚠️  Found ${duplicates.length} ${modelName.toLowerCase()} with duplicates:`
  );
  for (const { key, toDelete } of duplicates) {
    console.log(
      `  - key="${key}": ${toDelete.length + 1} copies (deleting ${toDelete.length})`
    );
  }

  // Delete duplicates
  let totalDeleted = 0;
  for (const { key, toDelete } of duplicates) {
    for (const item of toDelete) {
      const deleteMutation = `
        mutation Delete${modelName}($input: Delete${modelName}Input!) {
          delete${modelName}(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          id: item.id,
          _version: item._version,
        },
      };

      try {
        await graphqlRequest(deleteMutation, variables);
        totalDeleted++;
        const displayName = item.title || item.pk || item.id;
        console.log(`  ✅ Deleted duplicate: id=${item.id} "${displayName}"`);
      } catch (err) {
        console.error(`  ❌ Failed to delete id=${item.id}:`, err.message);
      }
    }
  }

  console.log(
    `\n✅ Deleted ${totalDeleted} duplicate ${modelName.toLowerCase()}!`
  );
  return totalDeleted;
}

async function main() {
  console.log("🧹 Clearing duplicate records from AppSync backend...\n");

  let totalDeleted = 0;

  // Clear duplicate Tasks (keyed by pk)
  totalDeleted += await clearDuplicates(
    "Task",
    "listTasks",
    `query ListTasks {
      listTasks {
        items {
          id
          pk
          title
          _version
          _lastChangedAt
        }
      }
    }`,
    item => item.pk
  );

  // Clear duplicate Activities (keyed by pk+sk)
  totalDeleted += await clearDuplicates(
    "Activity",
    "listActivities",
    `query ListActivities {
      listActivities {
        items {
          id
          pk
          sk
          title
          _version
          _lastChangedAt
        }
      }
    }`,
    item => `${item.pk}::${item.sk}`
  );

  // Clear duplicate Questions (keyed by pk+sk)
  totalDeleted += await clearDuplicates(
    "Question",
    "listQuestions",
    `query ListQuestions {
      listQuestions {
        items {
          id
          pk
          sk
          questionText
          _version
          _lastChangedAt
        }
      }
    }`,
    item => `${item.pk}::${item.sk}`
  );

  console.log(
    `\n🎉 Total deleted: ${totalDeleted} duplicate records across all models!`
  );
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
