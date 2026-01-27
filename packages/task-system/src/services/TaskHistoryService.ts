import { DataStore } from "@aws-amplify/datastore";
import { logWithDevice } from "@utils/logging/deviceLogger";
import { TaskHistory } from "@models/index";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import {
  CreateTaskHistoryInput,
  UpdateTaskHistoryInput,
} from "@task-types/TaskHistory";
import { ModelName } from "@constants/modelNames";

type TaskHistoryUpdateData = Omit<UpdateTaskHistoryInput, "id" | "_version">;

export class TaskHistoryService {
  static async createTaskHistory(
    input: CreateTaskHistoryInput
  ): Promise<TaskHistory> {
    const logger = getServiceLogger("TaskHistoryService");
    try {
      logger.info("Creating task history with DataStore", input);
      const history = await DataStore.save(
        new TaskHistory({
          ...input,
        })
      );

      logger.info("TaskHistory created successfully", { id: history.id });
      return history;
    } catch (error) {
      logger.error("Error creating task history", error);
      throw error;
    }
  }

  static async getTaskHistories(): Promise<TaskHistory[]> {
    try {
      return await DataStore.query(TaskHistory);
    } catch (error) {
      getServiceLogger("TaskHistoryService").error(
        "Error fetching task histories",
        error
      );
      throw error;
    }
  }

  static async getTaskHistory(id: string): Promise<TaskHistory | null> {
    try {
      const taskHistory = await DataStore.query(TaskHistory, id);
      return taskHistory || null;
    } catch (error) {
      getServiceLogger("TaskHistoryService").error(
        "Error fetching task history",
        error
      );
      throw error;
    }
  }

  static async updateTaskHistory(
    id: string,
    data: TaskHistoryUpdateData
  ): Promise<TaskHistory> {
    try {
      const original = await DataStore.query(TaskHistory, id);
      if (!original) {
        throw new Error(`TaskHistory with id ${id} not found`);
      }

      const updated = await DataStore.save(
        TaskHistory.copyOf(original, updated => {
          Object.assign(updated, data);
        })
      );

      return updated;
    } catch (error) {
      getServiceLogger("TaskHistoryService").error(
        "Error updating task history",
        error
      );
      throw error;
    }
  }

  static async deleteTaskHistory(id: string): Promise<void> {
    try {
      const toDelete = await DataStore.query(TaskHistory, id);
      if (!toDelete) {
        throw new Error(`TaskHistory with id ${id} not found`);
      }

      await DataStore.delete(toDelete);
    } catch (error) {
      getServiceLogger("TaskHistoryService").error(
        "Error deleting task history",
        error
      );
      throw error;
    }
  }

  static subscribeTaskHistories(
    callback: (items: TaskHistory[], isSynced: boolean) => void
  ): {
    unsubscribe: () => void;
  } {
    getServiceLogger("TaskHistoryService").info(
      "Setting up DataStore subscription for TaskHistory"
    );

    const filterNotDeleted = (items: TaskHistory[]): TaskHistory[] => {
      return items.filter(item => (item as any)?._deleted !== true);
    };

    const querySubscription = DataStore.observeQuery(TaskHistory).subscribe(
      snapshot => {
        const { items, isSynced } = snapshot;
        const visibleItems = filterNotDeleted(items);

        logWithDevice(
          "TaskHistoryService",
          "Subscription update (observeQuery)",
          {
            itemCount: visibleItems.length,
            isSynced,
            itemIds: visibleItems.map(i => i.id),
          }
        );

        callback(visibleItems, isSynced);
      },
      (error: unknown) => {
        getServiceLogger("TaskHistoryService").error(
          "DataStore subscription error",
          error instanceof Error ? error : new Error(String(error)),
          "DATA",
          "❌"
        );
        callback([], false);
      }
    );

    // Note: DELETE operations are already handled by observeQuery
    // The filterNotDeleted() function above removes deleted items from the snapshot
    // No need for a separate deleteObserver to avoid duplicate callbacks

    return {
      unsubscribe: () => {
        logWithDevice("TaskHistoryService", "Unsubscribing from DataStore");
        querySubscription.unsubscribe();
      },
    };
  }

  /**
   * Delete all TaskHistories
   * @returns {Promise<number>} - The number of task histories deleted
   */
  static async deleteAllTaskHistories(): Promise<number> {
    try {
      const histories = await DataStore.query(TaskHistory);
      let deletedCount = 0;

      for (const history of histories) {
        await DataStore.delete(history);
        deletedCount++;
      }

      getServiceLogger("TaskHistoryService").info(
        "Deleted all task histories",
        {
          deletedCount,
        }
      );

      return deletedCount;
    } catch (error) {
      getServiceLogger("TaskHistoryService").error(
        "Error deleting all task histories",
        error
      );
      throw error;
    }
  }

  static async clearDataStore(): Promise<void> {
    try {
      await DataStore.clear();
    } catch (error) {
      getServiceLogger("TaskHistoryService").error(
        "Error clearing DataStore",
        error
      );
      throw error;
    }
  }
}
