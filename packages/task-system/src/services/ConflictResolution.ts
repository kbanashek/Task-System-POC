import { DataStore, OpType } from "@aws-amplify/datastore";
import { ModelName } from "@constants/modelNames";
import { getServiceLogger } from "@utils/logging/serviceLogger";

/**
 * Base type constraint for DataStore models
 * All DataStore models must have id, and may have pk/sk for DynamoDB
 */
interface DataStoreModel {
  id: string;
  pk?: string;
  sk?: string;
  _deleted?: boolean;
  _version?: number;
  _lastChangedAt?: number;
}

/**
 * Ensures required keys (pk, sk, id) are present on a model
 * Uses fallback model to fill in missing keys if needed
 */
function ensurePkSk<T extends DataStoreModel>(
  model: T | null | undefined,
  fallback?: Partial<T> | null
): T | null {
  if (!model) return model as null;

  /**
   * IMPORTANT: Do NOT rely on object spread to carry pk/sk/id.
   *
   * Amplify can provide model instances where some properties are not enumerable,
   * and `{ ...model }` would drop them. That can cause DataStore to throw
   * "Field pk is required" inside the conflict handler path and enter an infinite retry loop.
   *
   * We always read keys via direct property access, then re-attach them explicitly.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawModel = model as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawFallback = fallback as any;

  const pk: string | undefined = rawModel?.pk ?? rawFallback?.pk;
  const sk: string | undefined = rawModel?.sk ?? rawFallback?.sk;
  const id: string | undefined = rawModel?.id ?? rawFallback?.id;

  // Keep the rest of the payload, then explicitly attach keys.
  const merged: Record<string, unknown> = { ...(rawModel ?? {}) };
  if (typeof pk === "string" && pk.length > 0) merged.pk = pk;
  if (typeof sk === "string" && sk.length > 0) merged.sk = sk;
  if (typeof id === "string" && id.length > 0) merged.id = id;

  return merged as T;
}

/**
 * Unified conflict resolution strategy for all DataStore models
 * This handles conflicts for Task, Question, Activity, DataPoint,
 * DataPointInstance, TaskAnswer, TaskResult, and TaskHistory
 *
 * Provides model-specific conflict resolution logic for AWS Amplify DataStore,
 * ensuring data consistency across local and remote state during sync operations.
 *
 * @example
 * ```typescript
 * // Configure conflict resolution on app initialization
 * ConflictResolution.configure();
 * ```
 */
/** Unified conflict resolution strategy for all task-system DataStore models. */
export class ConflictResolution {
  private static configured = false;

  /**
   * Reset configuration state (for testing only)
   * @internal
   */
  static resetForTesting() {
    this.configured = false;
  }

  /** Configure DataStore conflict resolution handlers for all task-system models. */
  static configure() {
    if (this.configured) {
      getServiceLogger("ConflictResolution").debug(
        "Conflict resolution already configured, skipping"
      );
      return;
    }

    DataStore.configure({
      conflictHandler: async ({
        modelConstructor,
        localModel,
        remoteModel,
        operation,
        attempts,
      }) => {
        const modelName = modelConstructor.name;
        getServiceLogger("ConflictResolution").debug(
          `Handling conflict for ${modelName}, operation: ${operation}, attempts: ${attempts}`,
          { modelName, operation, attempts }
        );

        // Cast to DataStoreModel since Amplify provides untyped models
        const safeLocal = (localModel as DataStoreModel) ?? null;
        const safeRemote = (remoteModel as DataStoreModel) ?? null;

        // Route to model-specific handlers
        switch (modelName) {
          case ModelName.Task:
            return this.resolveTask(
              safeLocal,
              safeRemote,
              operation,
              modelName
            );
          case ModelName.Activity:
            return this.resolveActivity(
              safeLocal,
              safeRemote,
              operation,
              modelName
            );
          case ModelName.Question:
            return this.resolveQuestion(
              safeLocal,
              safeRemote,
              operation,
              modelName
            );
          case ModelName.DataPoint:
          case ModelName.DataPointInstance:
          case ModelName.TaskAnswer:
          case ModelName.TaskResult:
          case ModelName.TaskHistory:
          case ModelName.TaskTempAnswer:
            return this.resolveGenericModel(
              safeLocal,
              safeRemote,
              operation,
              modelName
            );
          default:
            // Unknown model - default to remote
            return (
              ensurePkSk(safeRemote, safeLocal) ??
              ensurePkSk(safeLocal, safeRemote)
            );
        }
      },
    });

    this.configured = true;
    getServiceLogger("ConflictResolution").debug(
      "Conflict resolution configured successfully"
    );
  }

  /**
   * Task-specific conflict resolution
   * Prefers local status changes but remote timing updates
   */
  private static resolveTask(
    safeLocal: DataStoreModel | null,
    safeRemote: DataStoreModel | null,
    operation: OpType,
    modelName: string
  ): DataStoreModel | null {
    if (operation === OpType.UPDATE) {
      // Cast to any to access model-specific properties
      const local = safeLocal as any;
      const remote = safeRemote as any;

      const resolvedModel = {
        ...(remote || {}),
        status: local?.status || remote?.status,
        startTimeInMillSec:
          remote?.startTimeInMillSec || local?.startTimeInMillSec,
        expireTimeInMillSec:
          remote?.expireTimeInMillSec || local?.expireTimeInMillSec,
        endTimeInMillSec: remote?.endTimeInMillSec || local?.endTimeInMillSec,
        activityAnswer: local?.activityAnswer || remote?.activityAnswer,
        activityResponse: local?.activityResponse || remote?.activityResponse,
      };
      return ensurePkSk(resolvedModel, safeLocal);
    }

    if (operation === OpType.DELETE) {
      const local = safeLocal as any;
      return this.handleDelete(
        safeLocal,
        safeRemote,
        !local?.title && !local?.description
      );
    }

    return (
      ensurePkSk(safeRemote, safeLocal) ?? ensurePkSk(safeLocal, safeRemote)
    );
  }

  /**
   * Activity-specific conflict resolution
   */
  private static resolveActivity(
    safeLocal: DataStoreModel | null,
    safeRemote: DataStoreModel | null,
    operation: OpType,
    modelName: string
  ): DataStoreModel | null {
    if (operation === OpType.DELETE) {
      const local = safeLocal as any;
      return this.handleDelete(
        safeLocal,
        safeRemote,
        !local?.name && !local?.title
      );
    }

    return (
      ensurePkSk(safeRemote, safeLocal) ?? ensurePkSk(safeLocal, safeRemote)
    );
  }

  /**
   * Question-specific conflict resolution
   */
  private static resolveQuestion(
    safeLocal: DataStoreModel | null,
    safeRemote: DataStoreModel | null,
    operation: OpType,
    modelName: string
  ): DataStoreModel | null {
    if (operation === OpType.DELETE) {
      const local = safeLocal as any;
      return this.handleDelete(
        safeLocal,
        safeRemote,
        !local?.question && !local?.questionId
      );
    }

    return (
      ensurePkSk(safeRemote, safeLocal) ?? ensurePkSk(safeLocal, safeRemote)
    );
  }

  /**
   * Generic conflict resolution for models with pk/sk
   * Used for: DataPoint, DataPointInstance, TaskAnswer, TaskResult, TaskHistory
   */
  private static resolveGenericModel(
    safeLocal: DataStoreModel | null,
    safeRemote: DataStoreModel | null,
    operation: OpType,
    modelName: string
  ): DataStoreModel | null {
    if (operation === OpType.DELETE) {
      return this.handleDelete(
        safeLocal,
        safeRemote,
        !safeLocal?.pk && !safeLocal?.sk
      );
    }

    return (
      ensurePkSk(safeRemote, safeLocal) ?? ensurePkSk(safeLocal, safeRemote)
    );
  }

  /**
   * Common DELETE operation handler
   */
  private static handleDelete(
    safeLocal: DataStoreModel | null,
    safeRemote: DataStoreModel | null,
    isIncomplete: boolean
  ): DataStoreModel | null {
    // If remote is already deleted, use that version
    if (safeRemote?._deleted) {
      return ensurePkSk(safeRemote, safeLocal);
    }

    // If local model is incomplete, use remote with _deleted flag
    if (isIncomplete) {
      if (!safeRemote) {
        return ensurePkSk(safeLocal, safeRemote);
      }
      // Create a properly typed deleted model by spreading remote and setting _deleted
      const deletedRemote: DataStoreModel = { ...safeRemote, _deleted: true };
      return ensurePkSk(deletedRemote, safeLocal);
    }

    // Otherwise use local delete
    return ensurePkSk(safeLocal, safeRemote);
  }
}
