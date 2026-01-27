import { DataStore } from "@aws-amplify/datastore";
import { ConflictResolution } from "@services/ConflictResolution";
import { logWithPlatform } from "@utils/logging/platformLogger";

/**
 * LX ownership contract:
 * - Host app owns Amplify.configure()
 * - task-system package never calls Amplify.configure()
 * - Package may optionally start DataStore if the host asks it to
 */

export type TaskSystemInitOptions = {
  /**
   * If true, start DataStore after configuring package-level DataStore options.
   * Default: false (LX-style host ownership of DataStore lifecycle)
   */
  startDataStore?: boolean;

  /**
   * Organization identifier (parentId in Lumiere).
   * Used for S3 image storage path hierarchy.
   */
  organizationId?: string;

  /**
   * Study identifier.
   * Used for S3 image storage path hierarchy.
   */
  studyId?: string;

  /**
   * Study instance identifier.
   * Used for S3 image storage path hierarchy.
   */
  studyInstanceId?: string;
};

let startInFlight: Promise<void> | null = null;
const taskSystemLogs = new Map<string, number>();
const TASK_SYSTEM_LOG_DEDUP_MS = 10000; // 10 second window (React Strict Mode)

/**
 * Stored configuration for organization/study hierarchy.
 * Set via initTaskSystem, used for S3 image storage paths.
 */
let taskSystemConfig: {
  organizationId?: string;
  studyId?: string;
  studyInstanceId?: string;
} = {};

/**
 * Deduplicated TaskSystem logging
 */
function logTaskSystem(icon: string, message: string): void {
  const signature = `tasksystem-${message}`;
  const now = Date.now();
  const lastLogTime = taskSystemLogs.get(signature) || 0;

  if (now - lastLogTime < TASK_SYSTEM_LOG_DEDUP_MS) {
    return; // Skip duplicate
  }

  logWithPlatform(icon, "", "TaskSystem", message);
  taskSystemLogs.set(signature, now);
}

export async function initTaskSystem(
  options: TaskSystemInitOptions = {}
): Promise<void> {
  // Safe to call multiple times; this does NOT call Amplify.configure().
  logTaskSystem("⚙️", "Configuring conflict resolution");
  ConflictResolution.configure();
  logTaskSystem("✅", "Conflict resolution configured");

  // Store organization/study hierarchy for S3 image paths
  if (options.organizationId || options.studyId || options.studyInstanceId) {
    taskSystemConfig = {
      organizationId: options.organizationId,
      studyId: options.studyId,
      studyInstanceId: options.studyInstanceId,
    };
    logTaskSystem(
      "📁",
      `S3 hierarchy configured: org=${options.organizationId || "none"}, study=${options.studyId || "none"}, instance=${options.studyInstanceId || "none"}`
    );
  }

  if (options.startDataStore) {
    logTaskSystem("☁️", "Starting AWS DataStore (via initTaskSystem option)");
    // Only single-flight DataStore.start (avoid concurrent starts). Do not cache permanently.
    if (!startInFlight) {
      startInFlight = DataStore.start().finally(() => {
        startInFlight = null;
        logTaskSystem(
          "☁️",
          "AWS DataStore started (via initTaskSystem option)"
        );
      });
    }
    await startInFlight;
  }
}

/**
 * Gets the current task system configuration.
 * Used by components (e.g., ImageCapture) to access S3 hierarchy values.
 *
 * @returns Current configuration with organizationId, studyId, studyInstanceId
 */
export function getTaskSystemConfig(): {
  organizationId?: string;
  studyId?: string;
  studyInstanceId?: string;
} {
  return { ...taskSystemConfig };
}
