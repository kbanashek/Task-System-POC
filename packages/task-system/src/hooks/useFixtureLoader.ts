/**
 * Hook for loading fixtures with data source awareness.
 *
 * Integrates fixture loading with the DataSourceContext to support
 * switching between static and LX data sources.
 */

import type { DataSourceType } from "@contexts/DataSourceContext";
import { useDataSource } from "@contexts/DataSourceContext";
import type {
  ImportTaskSystemFixtureOptions,
  ImportTaskSystemFixtureResult,
  TaskSystemFixture,
} from "@fixtures/TaskSystemFixture";
import { FixtureImportService } from "@services/FixtureImportService";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import { useCallback, useState } from "react";

const logger = getServiceLogger("useFixtureLoader");

export interface UseFixtureLoaderOptions {
  /** Import options for DataStore */
  importOptions?: ImportTaskSystemFixtureOptions;
}

export interface UseFixtureLoaderReturn {
  /** Load a fixture for a specific data source */
  loadFixture: (
    source: DataSourceType,
    fixture: TaskSystemFixture
  ) => Promise<ImportTaskSystemFixtureResult>;
  /** Load static fixture (requires fixture data from host app) */
  loadStaticFixture: (
    fixture: TaskSystemFixture
  ) => Promise<ImportTaskSystemFixtureResult>;
  /** Load LX fixture (requires fixture data) */
  loadLxFixture: (
    fixture: TaskSystemFixture
  ) => Promise<ImportTaskSystemFixtureResult>;
  /** Reload the currently active fixture */
  reloadActiveFixture: () => Promise<ImportTaskSystemFixtureResult | null>;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Last import result */
  lastResult: ImportTaskSystemFixtureResult | null;
}

/**
 * Hook for loading and managing fixtures with data source switching.
 *
 * Automatically imports fixtures into DataStore when loaded and tracks
 * which data source is active.
 *
 * @param options - Configuration options
 * @returns Fixture loader functions and state
 *
 * @example
 * ```tsx
 * const { loadStaticFixture, loadLxFixture, loading } = useFixtureLoader({
 *   autoLoad: true
 * });
 *
 * // Load LX data
 * const lxFixture = await convertLxData(lxResponse);
 * await loadLxFixture(lxFixture);
 * ```
 */
export const useFixtureLoader = (
  options: UseFixtureLoaderOptions = {}
): UseFixtureLoaderReturn => {
  const { importOptions = {} } = options;
  const { loadFixture: loadFixtureToContext, getActiveFixture } =
    useDataSource();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] =
    useState<ImportTaskSystemFixtureResult | null>(null);

  /**
   * Load a fixture for a specific data source.
   */
  const loadFixture = useCallback(
    async (
      source: DataSourceType,
      fixture: TaskSystemFixture
    ): Promise<ImportTaskSystemFixtureResult> => {
      logger.info(
        `Starting fixture load for source: ${source}`,
        {
          source,
          taskCount: fixture.tasks.length,
          activityCount: fixture.activities.length,
          fixtureId: fixture.fixtureId,
        },
        "STEP-1",
        "📋"
      );

      setLoading(true);
      setError(null);

      try {
        // Import into DataStore
        logger.info(
          "Importing fixture into DataStore",
          {
            source,
            importOptions: {
              updateExisting: true,
              pruneNonFixture: false,
              pruneDerivedModels: false,
              ...importOptions,
            },
          },
          "STEP-2",
          "💾"
        );

        const result = await FixtureImportService.importTaskSystemFixture(
          fixture,
          {
            updateExisting: true,
            pruneNonFixture: false,
            pruneDerivedModels: false,
            ...importOptions,
          }
        );

        logger.info(
          "Fixture import completed",
          {
            source,
            tasksCreated: result.tasks.created,
            tasksUpdated: result.tasks.updated,
            activitiesCreated: result.activities.created,
            activitiesUpdated: result.activities.updated,
            totalTasks: result.tasks.created + result.tasks.updated,
            totalActivities:
              result.activities.created + result.activities.updated,
          },
          "STEP-3",
          "✅"
        );

        // Store in context
        logger.info(
          "Storing fixture in DataSourceContext",
          { source },
          "STEP-4",
          "💾"
        );
        loadFixtureToContext(source, fixture);
        logger.info("Fixture stored in context", { source }, "STEP-5", "✅");

        setLastResult(result);
        logger.info(
          `Fixture load completed successfully for source: ${source}`,
          {
            source,
            totalImported:
              result.tasks.created +
              result.tasks.updated +
              result.activities.created +
              result.activities.updated,
          },
          "SUCCESS",
          "✅"
        );
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Fixture load failed for source: ${source}`, err, "ERROR");
        setError(error);
        throw error;
      } finally {
        setLoading(false);
        logger.info(
          `Fixture load process finished for source: ${source}`,
          { source },
          "FINALLY",
          "🏁"
        );
      }
    },
    [importOptions, loadFixtureToContext]
  );

  /**
   * Load static fixture.
   * Host app must provide the fixture data.
   */
  const loadStaticFixture = useCallback(
    async (
      fixture: TaskSystemFixture
    ): Promise<ImportTaskSystemFixtureResult> => {
      logger.info(
        "loadStaticFixture called",
        {
          taskCount: fixture.tasks.length,
          activityCount: fixture.activities.length,
          fixtureId: fixture.fixtureId,
        },
        "ENTRY",
        "📋"
      );
      return await loadFixture("static", fixture);
    },
    [loadFixture]
  );

  /**
   * Load LX fixture.
   */
  const loadLxFixture = useCallback(
    async (
      fixture: TaskSystemFixture
    ): Promise<ImportTaskSystemFixtureResult> => {
      logger.info(
        "loadLxFixture called",
        {
          taskCount: fixture.tasks.length,
          activityCount: fixture.activities.length,
          fixtureId: fixture.fixtureId,
        },
        "ENTRY",
        "📋"
      );
      return await loadFixture("lx", fixture);
    },
    [loadFixture]
  );

  /**
   * Reload the currently active fixture.
   */
  const reloadActiveFixture =
    useCallback(async (): Promise<ImportTaskSystemFixtureResult | null> => {
      logger.info("reloadActiveFixture called", undefined, "ENTRY", "🔄");

      const activeFixture = getActiveFixture();
      if (!activeFixture) {
        const error = new Error("No active fixture to reload");
        logger.error("No active fixture to reload", error, "ERROR");
        setError(error);
        return null;
      }

      logger.info(
        "Active fixture found, starting reload",
        {
          taskCount: activeFixture.tasks.length,
          activityCount: activeFixture.activities.length,
          fixtureId: activeFixture.fixtureId,
        },
        "STEP-1",
        "📋"
      );

      setLoading(true);
      setError(null);

      try {
        logger.info(
          "Importing active fixture into DataStore",
          {
            importOptions: {
              updateExisting: true,
              pruneNonFixture: true,
              pruneDerivedModels: true,
              ...importOptions,
            },
          },
          "STEP-2",
          "💾"
        );

        const result = await FixtureImportService.importTaskSystemFixture(
          activeFixture,
          {
            updateExisting: true,
            pruneNonFixture: true,
            pruneDerivedModels: true,
            ...importOptions,
          }
        );

        logger.info(
          "Active fixture reload completed",
          {
            tasksCreated: result.tasks.created,
            tasksUpdated: result.tasks.updated,
            activitiesCreated: result.activities.created,
            activitiesUpdated: result.activities.updated,
          },
          "SUCCESS",
          "✅"
        );

        setLastResult(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error("Active fixture reload failed", error, "ERROR");
        setError(error);
        return null;
      } finally {
        setLoading(false);
        logger.info(
          "Active fixture reload process finished",
          undefined,
          "FINALLY",
          "🏁"
        );
      }
    }, [getActiveFixture, importOptions]);

  // Note: Auto-load removed - host app must explicitly load fixtures

  return {
    loadFixture,
    loadStaticFixture,
    loadLxFixture,
    reloadActiveFixture,
    loading,
    error,
    lastResult,
  };
};
