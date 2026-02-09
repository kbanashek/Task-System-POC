#!/usr/bin/env node

/**
 * Script to validate the AWS AppSync API key is still valid.
 * This prevents "Unauthorized" errors from expired/invalid API keys.
 *
 * Usage:
 *   node scripts/check-api-key.js
 *   yarn check-api-key
 */

const https = require("https");
const path = require("path");

// Read aws-exports.js to get the current API key and endpoint
const awsExportsPath = path.join(__dirname, "..", "aws-exports.js");
delete require.cache[require.resolve(awsExportsPath)]; // Clear cache
const awsExports = require(awsExportsPath).default;

const endpoint = awsExports.aws_appsync_graphqlEndpoint;
const apiKey = awsExports.aws_appsync_apiKey;

if (!endpoint || !apiKey) {
  console.error(
    "❌ Error: Could not find GraphQL endpoint or API key in aws-exports.js"
  );
  process.exit(1);
}

// Parse endpoint URL
const url = new URL(endpoint);

// Simple introspection query to test API key validity
const query = JSON.stringify({
  query: "query { __schema { queryType { name } } }",
});

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "Content-Length": Buffer.byteLength(query),
  },
};

console.log("🔍 Checking API key validity...");
console.log(`   Endpoint: ${endpoint}`);
console.log(`   API Key: ${apiKey.substring(0, 15)}...`);

const req = https.request(options, res => {
  let data = "";

  res.on("data", chunk => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);

      if (response.errors) {
        const isUnauthorized = response.errors.some(
          err => err.errorType === "UnauthorizedException"
        );

        if (isUnauthorized) {
          console.error("\n❌ API KEY IS INVALID OR EXPIRED!");
          console.error(
            "   The API key cannot authenticate with the AppSync endpoint."
          );
          console.error("\n📝 To fix this:");
          console.error(
            "   1. Go to AWS Console → AppSync → oriontasksystem → Settings → API Keys"
          );
          console.error(
            "   2. Create a new API key (365-day expiration recommended)"
          );
          console.error("   3. Update aws-exports.js (line 9)");
          console.error(
            "   4. Update orion-mobile/Lumiere/src/services/amplify/amplifyConfig.ts"
          );
          console.error(
            "   5. Rebuild: yarn build && cd orion-mobile/Lumiere && yarn start -c\n"
          );
          process.exit(1);
        } else {
          console.error("\n⚠️  API key is valid, but query failed:");
          console.error(JSON.stringify(response.errors, null, 2));
          process.exit(1);
        }
      }

      if (response.data && response.data.__schema) {
        console.log("\n✅ API KEY IS VALID!");
        console.log("   Successfully authenticated with AppSync endpoint.");
        console.log("   DataStore sync should work correctly.\n");
        process.exit(0);
      } else {
        console.error("\n⚠️  Unexpected response format:");
        console.error(JSON.stringify(response, null, 2));
        process.exit(1);
      }
    } catch (err) {
      console.error("\n❌ Error parsing response:", err.message);
      console.error("   Raw response:", data);
      process.exit(1);
    }
  });
});

req.on("error", err => {
  console.error("\n❌ Error connecting to AppSync endpoint:", err.message);
  console.error("   Endpoint:", endpoint);
  process.exit(1);
});

req.write(query);
req.end();
