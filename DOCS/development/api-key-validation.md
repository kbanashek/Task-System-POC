# API Key Validation

## Overview

The AppSync API key is used for authenticating DataStore operations. If it expires or becomes invalid, DataStore sync will fail with "Unauthorized" errors.

## Checking API Key Validity

### Manual Check

Run the validation script anytime:

```bash
yarn check:api-key
```

This will test the API key against the AppSync endpoint and report:

- ✅ **Valid**: API key can authenticate successfully
- ❌ **Invalid/Expired**: API key is expired or invalid

### Automated Checks

The API key is automatically validated in:

- **PR Checks**: Every pull request runs the validation
- **Manual**: Run `yarn check:api-key` anytime

## When API Key Expires

If the API key is expired or invalid, you'll see:

```
❌ API KEY IS INVALID OR EXPIRED!
   The API key cannot authenticate with the AppSync endpoint.
```

### How to Regenerate

1. Go to **AWS Console** → **AppSync** → **oriontasksystem** → **Settings** → **API Keys**
2. Check the expiration date of the current key
3. Create a new API key with **365-day expiration** (recommended)
4. Copy the new key
5. Update the key in **both locations**:

#### Location 1: orion-task-system package

`/Users/Kyle.Banashek/Source/orion-task-system/aws-exports.js`

```javascript
const awsmobile = {
  // ...
  aws_appsync_apiKey: "da2-YOUR-NEW-API-KEY-HERE",
};
```

#### Location 2: orion-mobile Lumiere app

`/Users/Kyle.Banashek/Source/orion-mobile/Lumiere/src/services/amplify/amplifyConfig.ts`

```typescript
export const amplifyConfig: ResourcesConfig = {
  API: {
    GraphQL: {
      endpoint:
        "https://vbdp5buj4jedlodz33zx5xsuqy.appsync-api.us-east-1.amazonaws.com/graphql",
      region: "us-east-1",
      defaultAuthMode: "apiKey",
      apiKey: "da2-YOUR-NEW-API-KEY-HERE", // ← Update here
    },
  },
};
```

6. **Rebuild and restart**:

```bash
# Rebuild task-system package
cd /Users/Kyle.Banashek/Source/orion-task-system/packages/task-system
yarn build

# Restart mobile app with cache cleared
cd /Users/Kyle.Banashek/Source/orion-mobile/Lumiere
yarn start -c
```

7. **Verify the new key**:

```bash
cd /Users/Kyle.Banashek/Source/orion-task-system
yarn check:api-key
```

## How the Script Works

The validation script (`scripts/check-api-key.js`):

1. Reads `aws-exports.js` to get the current API key and endpoint
2. Sends a simple introspection query to the AppSync endpoint
3. Checks if the response is authorized or returns "UnauthorizedException"
4. Reports the status with actionable instructions if invalid

## CI/CD Integration

The API key validation is integrated into GitHub Actions:

- **Workflow**: `.github/workflows/pr-checks.yml`
- **Job**: `api-key-check`
- **Trigger**: Every PR to `develop` or `main`

If the API key is invalid, the PR check will fail with clear instructions on how to fix it.

## Troubleshooting

### "Sync status: LOCAL-ONLY"

If DataStore shows `LOCAL-ONLY` instead of `CLOUD-SYNCED`, the API key might be invalid:

1. Check the API key: `yarn check:api-key`
2. If invalid, regenerate following the steps above
3. Rebuild the package and restart the app

### "Unauthorized" errors in logs

If you see these errors:

```
❌ [iOS] [DATA] TaskService: Failed to create task in AWS DataStore - Unauthorized
```

The API key is likely expired. Run `yarn check:api-key` to confirm.

## Prevention

To prevent API key expiration issues:

- **Use 365-day expiration** when creating keys (default is 7 days)
- **Run `yarn check:api-key` regularly** (monthly or before demos)
- **Monitor PR checks** - they automatically validate the API key
- **Calendar reminder**: Set a reminder 1 week before the key expires

## API Key Lifecycle

Typical AWS AppSync API key lifecycle:

- **Creation**: Generate in AWS Console → AppSync → Settings → API Keys
- **Lifespan**: 7 days (default) or up to 365 days (recommended)
- **Expiration**: Key stops working immediately after expiration
- **Rotation**: No automatic rotation - manual regeneration required

## Security Note

The API key is stored in:

- `aws-exports.js` (gitignored in task-system package)
- `amplifyConfig.ts` (committed in orion-mobile)

**Important**: API keys provide limited access (typically read/write to specific models). They are less sensitive than user credentials but should still be:

- Not shared publicly
- Rotated regularly
- Used with appropriate AppSync authorization rules (`@auth`)
