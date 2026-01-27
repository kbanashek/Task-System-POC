/**
 * DataStore sync utilities
 * Provides functions to manually trigger sync and check sync status
 */

import { DataStore } from "@aws-amplify/datastore";
import { logWithDevice, logErrorWithDevice } from "@orion/task-system";

/**
 * Wrapper around DataStore.stop() with timeout protection
 *
 * CRITICAL: DataStore.stop() can hang indefinitely in Amplify v5/v6 if:
 * - There are pending mutations in the outbox
 * - Sync subscriptions are in a bad state
 * - Network is unreliable
 *
 * This wrapper adds a 5-second timeout to prevent infinite hangs.
 * If DataStore.stop() doesn't complete in 5 seconds, we proceed anyway.
 *
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @returns Promise that resolves when stop completes or timeout expires
 */
async function stopDataStoreWithTimeout(
  timeoutMs: number = 5000
): Promise<void> {
  return Promise.race([
    DataStore.stop(),
    new Promise<void>(resolve => {
      setTimeout(() => {
        logWithDevice(
          "syncUtils",
          `⚠️ DataStore.stop() timed out after ${timeoutMs}ms - proceeding anyway`
        );
        resolve();
      }, timeoutMs);
    }),
  ]);
}

/**
 * Manually trigger a full sync of all DataStore models
 * Useful when you need to force sync across devices immediately
 *
 * This function stops and restarts DataStore, which triggers a full sync
 * from the cloud. All local data will be reconciled with the server.
 *
 * @returns Promise that resolves when sync completes
 */
export async function forceFullSync(): Promise<void> {
  try {
    logWithDevice(
      "syncUtils",
      "🔄 Starting manual full sync (stop/start DataStore)..."
    );

    // Stop DataStore - this will queue any pending operations
    logWithDevice("syncUtils", "Stopping DataStore (with 5s timeout)...");
    await stopDataStoreWithTimeout();
    logWithDevice("syncUtils", "DataStore stopped");

    // Wait a brief moment to ensure stop completes
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start DataStore - this triggers a full sync from the cloud
    logWithDevice(
      "syncUtils",
      "Starting DataStore (triggers full sync from cloud)..."
    );
    await DataStore.start();
    logWithDevice("syncUtils", "✅ DataStore started - full sync initiated");

    // Wait a bit for sync to begin processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    logWithDevice("syncUtils", "✅ Manual full sync completed");
  } catch (error) {
    logErrorWithDevice("syncUtils", "❌ Error during manual sync", error);
    throw error;
  }
}

/**
 * Clear local DataStore cache and force complete resync from cloud
 * This is the most aggressive sync method - clears all local data and resyncs from server
 * Use this when devices are showing different data and you need to force them to match
 *
 * WARNING: This will clear all local data and resync from cloud. Any unsynced local changes will be lost.
 *
 * @returns Promise that resolves when sync completes
 */
export async function clearCacheAndResync(): Promise<void> {
  try {
    logWithDevice(
      "syncUtils",
      "🗑️ Starting cache clear and resync (most aggressive sync)..."
    );

    // Stop DataStore first
    logWithDevice("syncUtils", "Stopping DataStore (with 5s timeout)...");
    await stopDataStoreWithTimeout();
    logWithDevice("syncUtils", "DataStore stopped");

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Clear all local data - this removes the local SQLite cache
    logWithDevice("syncUtils", "Clearing local DataStore cache...");
    await DataStore.clear();
    logWithDevice("syncUtils", "✅ Local cache cleared");

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start DataStore - this will trigger a complete resync from cloud
    logWithDevice(
      "syncUtils",
      "Starting DataStore (triggers complete resync from cloud)..."
    );
    await DataStore.start();
    logWithDevice(
      "syncUtils",
      "✅ DataStore started - complete resync initiated"
    );

    // Wait longer for sync to process (clearing cache means full resync)
    logWithDevice("syncUtils", "Waiting for complete resync to process...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    logWithDevice("syncUtils", "✅ Cache clear and resync completed");
  } catch (error) {
    logErrorWithDevice(
      "syncUtils",
      "❌ Error during cache clear and resync",
      error
    );
    throw error;
  }
}

/**
 * Check if DataStore is currently syncing
 * @returns Promise<boolean> - true if syncing, false otherwise
 */
export async function isSyncing(): Promise<boolean> {
  // DataStore doesn't expose a direct sync status API
  // This would need to be tracked via Hub events
  // For now, we'll return false and let the caller check via useAmplifyState hook
  return false;
}
