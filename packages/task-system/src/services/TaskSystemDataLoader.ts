/**
 * Service for loading task system data (static fixtures or LX data) into DataStore.
 *
 * Handles the complete flow:
 * 1. Ensures DataStore is initialized with schema
 * 2. Clears existing data (optional)
 * 3. Imports fixture data into DataStore
 *
 * This service simplifies the data loading process for host apps.
 */

import { Hub } from "@aws-amplify/core";
import { DataStore } from "@aws-amplify/datastore";
import type {
  ImportTaskSystemFixtureOptions,
  ImportTaskSystemFixtureResult,
  TaskSystemFixture,
} from "@fixtures/TaskSystemFixture";
import { initTaskSystem } from "@runtime/taskSystem";
import { FixtureImportService } from "@services/FixtureImportService";
import { resetDataStore } from "@utils/datastore/dataStoreReset";

export interface LoadTaskSystemDataOptions {
  /** Clear DataStore before importing */
  clearBeforeImport?: boolean;
  /** Import options for FixtureImportService */
  importOptions?: ImportTaskSystemFixtureOptions;
  /** Whether to start DataStore if not already started */
  startDataStore?: boolean;
}

export interface LoadTaskSystemDataResult {
  /** Import result from FixtureImportService */
  importResult: ImportTaskSystemFixtureResult;
  /** Whether DataStore was initialized by this call */
  dataStoreInitialized: boolean;
}

/**
 * Loads task system fixture data into DataStore.
 *
 * This is the main entry point for loading either static fixtures or LX-converted data.
 * It handles all initialization, clearing, and import steps.
 *
 * @param fixture - The fixture data to import
 * @param options - Configuration options
 * @returns Import result and initialization status
 *
 * @example
 * ```typescript
 * const fixture = await convertLxDataToFixture(lxResponse);
 * const result = await TaskSystemDataLoader.loadData(fixture, {
 *   clearBeforeImport: true,
 *   importOptions: { updateExisting: true }
 * });
 * ```
 */
export class TaskSystemDataLoader {
  /**
   * Loads fixture data into DataStore.
   *
   * Ensures DataStore is properly initialized before importing data.
   */
  static async loadData(
    fixture: TaskSystemFixture,
    options: LoadTaskSystemDataOptions = {}
  ): Promise<LoadTaskSystemDataResult> {
    const {
      clearBeforeImport = false,
      importOptions = {},
      startDataStore = false,
    } = options;

    // Step 1: Initialize task-system runtime (registers schema, configures conflict handler)
    // This is idempotent - safe to call multiple times
    let dataStoreInitialized = false;
    try {
      await initTaskSystem({ startDataStore: false });
      // If DataStore needs to be started, do it now (after schema is registered)
      if (startDataStore) {
        await DataStore.start();
        dataStoreInitialized = true;
      }
    } catch (error) {
      // If already initialized, that's fine - continue
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("already") && !message.includes("initialized")) {
        throw new Error(`Failed to initialize task-system: ${message}`);
      }
    }

    // Step 2: Clear DataStore if requested
    if (clearBeforeImport) {
      await resetDataStore(
        { dataStore: DataStore, hub: Hub },
        {
          mode: "clearAndRestart",
          waitForOutboxEmpty: true,
          outboxTimeoutMs: 2000,
          stopTimeoutMs: 5000,
          clearTimeoutMs: 5000,
          startTimeoutMs: 5000,
          proceedOnStopTimeout: true,
        }
      );
    }

    // Step 3: Import fixture data
    const importResult = await FixtureImportService.importTaskSystemFixture(
      fixture,
      {
        updateExisting: true,
        pruneNonFixture: false,
        pruneDerivedModels: false,
        ...importOptions,
      }
    );

    return {
      importResult,
      dataStoreInitialized,
    };
  }

  /**
   * Convenience method for loading static fixture data.
   */
  static async loadStaticFixture(
    fixture: TaskSystemFixture,
    options: LoadTaskSystemDataOptions = {}
  ): Promise<LoadTaskSystemDataResult> {
    return this.loadData(fixture, {
      clearBeforeImport: true,
      ...options,
    });
  }

  /**
   * Convenience method for loading LX-converted fixture data.
   */
  static async loadLxFixture(
    fixture: TaskSystemFixture,
    options: LoadTaskSystemDataOptions = {}
  ): Promise<LoadTaskSystemDataResult> {
    return this.loadData(fixture, {
      clearBeforeImport: true,
      ...options,
    });
  }
}
