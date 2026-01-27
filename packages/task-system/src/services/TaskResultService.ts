import { DataStore, OpType } from "@aws-amplify/datastore";
import { OperationSource } from "@constants/operationSource";
import { TaskResult } from "@models/index";
import {
  CreateTaskResultInput,
  UpdateTaskResultInput,
} from "@task-types/TaskResult";
import { logErrorWithDevice, logWithDevice } from "@utils/logging/deviceLogger";
import { getServiceLogger } from "@utils/logging/serviceLogger";

type TaskResultUpdateData = Omit<UpdateTaskResultInput, "id" | "_version">;

export class TaskResultService {
  static async createTaskResult(
    input: CreateTaskResultInput
  ): Promise<TaskResult> {
    const logger = getServiceLogger("TaskResultService");
    try {
      logger.info("Creating task result with DataStore", input);
      const result = await DataStore.save(
        new TaskResult({
          ...input,
        })
      );

      logger.info("TaskResult created successfully", { id: result.id });
      return result;
    } catch (error) {
      logger.error("Error creating task result", error);
      throw error;
    }
  }

  static async getTaskResults(): Promise<TaskResult[]> {
    try {
      return await DataStore.query(TaskResult);
    } catch (error) {
      getServiceLogger("TaskResultService").error(
        "Error fetching task results",
        error
      );
      throw error;
    }
  }

  static async getTaskResult(id: string): Promise<TaskResult | null> {
    try {
      const taskResult = await DataStore.query(TaskResult, id);
      return taskResult || null;
    } catch (error) {
      getServiceLogger("TaskResultService").error(
        "Error fetching task result",
        error
      );
      throw error;
    }
  }

  static async updateTaskResult(
    id: string,
    data: TaskResultUpdateData
  ): Promise<TaskResult> {
    try {
      const original = await DataStore.query(TaskResult, id);
      if (!original) {
        throw new Error(`TaskResult with id ${id} not found`);
      }

      const updated = await DataStore.save(
        TaskResult.copyOf(original, updated => {
          Object.assign(updated, data);
        })
      );

      return updated;
    } catch (error) {
      getServiceLogger("TaskResultService").error(
        "Error updating task result",
        error
      );
      throw error;
    }
  }

  static async deleteTaskResult(id: string): Promise<void> {
    try {
      const toDelete = await DataStore.query(TaskResult, id);
      if (!toDelete) {
        throw new Error(`TaskResult with id ${id} not found`);
      }

      await DataStore.delete(toDelete);
    } catch (error) {
      getServiceLogger("TaskResultService").error(
        "Error deleting task result",
        error
      );
      throw error;
    }
  }

  static subscribeTaskResults(
    callback: (items: TaskResult[], isSynced: boolean) => void
  ): {
    unsubscribe: () => void;
  } {
    getServiceLogger("TaskResultService").info(
      "Setting up DataStore subscription for TaskResult"
    );

    const filterNotDeleted = (items: TaskResult[]): TaskResult[] => {
      return items.filter(item => (item as any)?._deleted !== true);
    };

    const querySubscription = DataStore.observeQuery(TaskResult).subscribe(
      snapshot => {
        const { items, isSynced } = snapshot;
        const visibleItems = filterNotDeleted(items);

        logWithDevice(
          "TaskResultService",
          "Subscription update (observeQuery)",
          {
            itemCount: visibleItems.length,
            isSynced,
            itemIds: visibleItems.map(i => i.id),
          }
        );

        callback(visibleItems, isSynced);
      },
      error => {
        logErrorWithDevice(
          "TaskResultService",
          "DataStore subscription error",
          error
        );
        callback([], false);
      }
    );

    // Also observe DELETE operations to ensure deletions trigger updates
    const deleteObserver = DataStore.observe(TaskResult).subscribe(
      msg => {
        if (msg.opType === OpType.DELETE) {
          const element = msg.element as any;
          const isLocalDelete = element?._deleted === true;
          const source = isLocalDelete
            ? OperationSource.LOCAL
            : OperationSource.REMOTE_SYNC;

          logWithDevice(
            "TaskResultService",
            `DELETE operation detected (${source})`,
            {
              taskResultId: element?.id,
              taskId: element?.taskId,
              deleted: element?._deleted,
              operationType: msg.opType,
            }
          );

          DataStore.query(TaskResult)
            .then(results => {
              const visibleResults = filterNotDeleted(results);
              logWithDevice(
                "TaskResultService",
                "Query refresh after DELETE completed",
                {
                  remainingResultCount: visibleResults.length,
                }
              );
              callback(visibleResults, true);
            })
            .catch(err => {
              logErrorWithDevice(
                "TaskResultService",
                "Error refreshing after delete",
                err
              );
            });
        }
      },
      error => {
        logErrorWithDevice("TaskResultService", "DELETE observer error", error);
      }
    );

    return {
      unsubscribe: () => {
        logWithDevice("TaskResultService", "Unsubscribing from DataStore");
        querySubscription.unsubscribe();
        deleteObserver.unsubscribe();
      },
    };
  }

  /**
   * Delete all TaskResults
   * @returns {Promise<number>} - The number of task results deleted
   */
  static async deleteAllTaskResults(): Promise<number> {
    try {
      const results = await DataStore.query(TaskResult);
      let deletedCount = 0;

      for (const result of results) {
        await DataStore.delete(result);
        deletedCount++;
      }

      getServiceLogger("TaskResultService").info("Deleted all task results", {
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      getServiceLogger("TaskResultService").error(
        "Error deleting all task results",
        error
      );
      throw error;
    }
  }

  static async clearDataStore(): Promise<void> {
    try {
      await DataStore.clear();
    } catch (error) {
      getServiceLogger("TaskResultService").error(
        "Error clearing DataStore",
        error
      );
      throw error;
    }
  }
}
