# DataStore Sync Troubleshooting Guide

## Overview

AWS Amplify DataStore provides offline-first data synchronization. However, certain conditions can cause sync to break, resulting in devices showing different data despite both claiming to be "synced".

This guide documents known causes of sync corruption and how to prevent/fix them.

---

## Root Causes of Sync Corruption

### 1. **Missing Polyfills (Hermes Engine)**

**Symptom:** `TypeError: Cannot read property '__extends' of undefined`

**Cause:** React Native's Hermes engine doesn't include all JavaScript/TypeScript runtime helpers that AWS SDK packages expect.

**Required Polyfills:**

- `tslib` - TypeScript helpers (`__extends`, `__assign`, etc.)
- `react-native-url-polyfill` - URL parsing for AWS SDK
- `react-native-get-random-values` - Crypto operations

**Fix:**

```javascript
// entry.js - MUST be imported FIRST
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
// Then import Amplify...
```

**Prevention:** Always import polyfills before any Amplify imports.

---

### 2. **Corrupted DataStore Sync Metadata**

**Symptom:**

- Devices show `isSynced: true` but have different data
- `modelSynced` events show `new: 0, updated: 0, deleted: 0` despite data mismatch
- Outbox processes mutations but other devices don't receive updates

**Cause:** Local SQLite cache has incorrect sync version metadata, causing DataStore to think it's synced when it's not.

**Common Triggers:**

- Schema changes without clearing cache
- Interrupted sync during schema migration
- App killed during DataStore initialization
- Network issues during initial sync

**Fix Options:**

**Option A: Force DataStore Resync (preferred)**

```typescript
// Clears local cache and forces fresh pull from AWS
await DataStore.clear();
await DataStore.start();
```

**Option B: Delete and Reinstall App (nuclear)**

- Deletes app from simulator/device
- Clears all local data (SQLite, AsyncStorage, etc.)
- Reinstall pulls fresh data from AWS

**Prevention:**

- Always run `DataStore.clear()` after schema changes
- Use "Force DataStore Resync" button in Dev Options when sync seems stuck
- Monitor Sync Health Dashboard for early warning signs

---

### 3. **Soft Deletes in DynamoDB**

**Symptom:**

- Deleted items still appear on some devices
- `_deleted: true` records in DynamoDB
- Sync shows "deleted: X" but items reappear

**Cause:** AppSync uses soft deletes by default. GraphQL `delete` mutations only mark items as `_deleted: true` but don't remove them from DynamoDB.

**Fix:**

```bash
# Hard delete via AWS CLI (for development/testing)
aws dynamodb delete-item \
  --table-name YourTable \
  --key '{"id": {"S": "item-id"}}'
```

**Prevention:**

- Use "Delete EVERYTHING" in Dev Options (hard deletes via DataStore)
- For production, implement TTL on `_deleted` items in DynamoDB

---

### 4. **Schema Mismatch (Local vs Cloud)**

**Symptom:**

- `amplify codegen models` errors
- DataStore initialization fails
- Sync queries return empty results

**Cause:** Local GraphQL schema doesn't match deployed schema in AWS AppSync.

**Common Triggers:**

- Uncommitted schema changes
- `amplify push` not run after schema update
- Pulling from different Amplify environment

**Fix:**

```bash
# Revert local schema to match cloud
git restore amplify/backend/api/*/schema.graphql

# Or push local schema to cloud
amplify push

# Regenerate models
amplify codegen models
```

**Prevention:**

- Always run `amplify push` after schema changes
- Always run `amplify codegen models` after push
- Delete and reinstall apps after schema changes

---

### 5. **DataStore.stop() Hanging (Known Bug)**

**Symptom:**

- App freezes when calling `DataStore.stop()`
- Operations never complete
- UI becomes unresponsive

**Cause:** Known bug in Amplify DataStore v5/v6 where `DataStore.stop()` hangs if there are pending mutations or sync is in bad state.

**Fix:**

```typescript
// Use timeout protection
async function stopDataStoreWithTimeout(timeoutMs = 5000): Promise<void> {
  return Promise.race([
    DataStore.stop(),
    new Promise<void>(resolve => {
      setTimeout(() => {
        console.warn(`DataStore.stop() timed out after ${timeoutMs}ms`);
        resolve();
      }, timeoutMs);
    }),
  ]);
}
```

**Prevention:**

- Avoid calling `DataStore.stop()` unless absolutely necessary
- Use `DataStore.clear()` instead of stop/start cycle when possible
- Never call stop/clear during active mutations (check outbox first)

---

## Diagnostic Tools

### 1. **Sync Health Dashboard**

Location: Dev Options → Sync Health (top of screen)

Shows real-time:

- Network status (online/offline)
- Sync state (syncing/synced/error)
- Pending mutations count
- Conflict count
- Last sync time

**Warnings:**

- ⚠️ > 5 pending mutations → Sync slow or stuck
- ❌ Conflicts detected → Data inconsistent across devices
- 📡 Offline → Changes queued, will sync when online

### 2. **DataStore Hub Event Logging**

All DataStore events are logged via `useAmplifyState` hook:

```typescript
Hub.listen("datastore", hubData => {
  // Logs all events: networkStatus, syncQueriesStarted/Ready/Error,
  // outboxStatus, outboxMutationEnqueued/Processed, modelSynced, etc.
});
```

**Check logs for:**

- `syncQueriesReady` → Initial sync complete
- `modelSynced` with `new: 0, updated: 0, deleted: 0` → Possible corruption
- `outboxMutationProcessed` → Mutation sent to cloud
- `conflictDetected` → Data conflict needs resolution

### 3. **Enhanced Subscription Logging**

TaskTempAnswer subscriptions now log:

- What data was received from DataStore
- Parsed answer values
- Merged answer counts
- Whether `setInitialAnswers` was called

Look for mismatches in `answersPreview` between devices.

---

## Quick Fixes Checklist

### Sync Not Working at All

1. ✅ Check network status in Sync Health Dashboard
2. ✅ Check if outbox has pending mutations (should be 0 when idle)
3. ✅ Check logs for `syncQueriesReady` event
4. ✅ Try "Force DataStore Resync" in Dev Options
5. ✅ If still broken → Delete and reinstall app

### Devices Showing Different Data

1. ✅ Check Sync Health Dashboard on both devices
2. ✅ Compare "Last Sync" times (should be recent)
3. ✅ Check for conflicts (should be 0)
4. ✅ Try "Force DataStore Resync" on stuck device
5. ✅ If still broken → "Delete EVERYTHING" → Resync → Reseed

### Sync Slow or Stuck

1. ✅ Check pending mutations count (should be < 5)
2. ✅ Check network status (online?)
3. ✅ Check logs for errors in `syncQueriesError` or `outboxMutationProcessed`
4. ✅ Wait 10 seconds (fullSyncInterval = 5s, allow buffer)
5. ✅ If still stuck → Force Resync

---

## Prevention Best Practices

### Development Workflow

1. **After schema changes:**
   - Run `amplify push`
   - Run `amplify codegen models`
   - Delete and reinstall all test apps
   - Use "Delete EVERYTHING" in Dev Options

2. **When adding packages:**
   - Delete and reinstall apps (clears Metro cache)
   - Never just reload (`r`) after adding packages

3. **When sync seems off:**
   - Check Sync Health Dashboard FIRST
   - Use "Force DataStore Resync" BEFORE deleting apps
   - Only delete apps if Force Resync doesn't work

### Monitoring

- Check Sync Health Dashboard regularly during testing
- Watch for warnings (pending mutations, conflicts)
- Monitor "Last Sync" time (should update every 5-10 seconds)
- Check logs for `conflictDetected` events

### Code Practices

- Always import polyfills first in `entry.js`
- Never call `DataStore.stop()` without timeout protection
- Use `DataStore.clear()` instead of stop/start when possible
- Check outbox is empty before calling stop/clear
- Wait for `syncQueriesReady` before assuming data is available

---

## Known Issues & Workarounds

### Issue: iOS and Android Show Different Data After Clean Install

**Cause:** Devices pulling from different DynamoDB records with same `taskPk` but different IDs.

**Workaround:**

1. "Delete EVERYTHING" from Dev Options (hard deletes)
2. Force Resync on both devices
3. Add test data from ONE device only
4. Wait 10 seconds, check other device

### Issue: Temp Answers Not Syncing Cross-Device

**Cause:** TaskTempAnswer subscriptions only seeing local records, not pulling from cloud.

**Debug:**

1. Check logs for `answersPreview` on both devices
2. Compare record IDs (should be same ID if synced)
3. Check "Last Sync" time in Sync Health Dashboard
4. Force Resync if IDs are different

**Fix:**

- Force Resync on both devices
- If still broken → Delete EVERYTHING → Resync → Reseed

---

## When to Contact Support

If you've tried everything and sync is still broken:

1. ✅ Collected logs from both devices
2. ✅ Confirmed network is online on both
3. ✅ Confirmed polyfills are imported
4. ✅ Confirmed schema matches cloud
5. ✅ Tried Force Resync multiple times
6. ✅ Tried delete/reinstall multiple times
7. ✅ Tried hard deleting DynamoDB data

Then it may be an Amplify DataStore bug. Check:

- [Amplify DataStore GitHub Issues](https://github.com/aws-amplify/amplify-js/issues)
- [AWS Amplify Discord](https://discord.gg/amplify)
- [AWS Support](https://aws.amazon.com/support/)

---

## Summary

**Most Common Fixes (in order):**

1. Force DataStore Resync (fixes 90% of issues)
2. Delete and reinstall app (clears corrupted cache)
3. Delete EVERYTHING → Resync → Reseed (nuclear option)

**Prevention:**

- Monitor Sync Health Dashboard
- Use Force Resync when sync seems off
- Always delete/reinstall after schema changes
- Never skip polyfills in entry.js

**Key Diagnostic:** If "Last Sync" time is recent but data is different → Corrupted sync metadata → Force Resync
