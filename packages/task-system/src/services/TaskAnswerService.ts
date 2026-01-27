import { DataStore, OpType } from "@aws-amplify/datastore";
import { OperationSource } from "@constants/operationSource";
import { TaskAnswer } from "@models/index";
import {
  CreateTaskAnswerInput,
  UpdateTaskAnswerInput,
} from "@task-types/TaskAnswer";
import { logErrorWithDevice, logWithDevice } from "@utils/logging/deviceLogger";
import { getServiceLogger } from "@utils/logging/serviceLogger";

type TaskAnswerUpdateData = Omit<UpdateTaskAnswerInput, "id" | "_version">;

/**
 * Service for managing TaskAnswer entities via AWS DataStore.
 * Provides CRUD operations and real-time subscriptions for task answers.
 */
export class TaskAnswerService {
  static async createTaskAnswer(
    input: CreateTaskAnswerInput
  ): Promise<TaskAnswer> {
    const logger = getServiceLogger("TaskAnswerService");
    try {
      logger.info("Creating task answer with DataStore", input);
      const answer = await DataStore.save(
        new TaskAnswer({
          ...input,
        })
      );

      logger.info("TaskAnswer created successfully", { id: answer.id });
      return answer;
    } catch (error) {
      logger.error("Error creating task answer", error);
      throw error;
    }
  }

  static async getTaskAnswers(): Promise<TaskAnswer[]> {
    try {
      return await DataStore.query(TaskAnswer);
    } catch (error) {
      getServiceLogger("TaskAnswerService").error(
        "Error fetching task answers",
        error
      );
      throw error;
    }
  }

  static async getTaskAnswer(id: string): Promise<TaskAnswer | null> {
    try {
      const taskAnswer = await DataStore.query(TaskAnswer, id);
      return taskAnswer || null;
    } catch (error) {
      getServiceLogger("TaskAnswerService").error(
        "Error fetching task answer",
        error
      );
      throw error;
    }
  }

  static async updateTaskAnswer(
    id: string,
    data: TaskAnswerUpdateData
  ): Promise<TaskAnswer> {
    try {
      const original = await DataStore.query(TaskAnswer, id);
      if (!original) {
        throw new Error(`TaskAnswer with id ${id} not found`);
      }

      const updated = await DataStore.save(
        TaskAnswer.copyOf(original, updated => {
          Object.assign(updated, data);
        })
      );

      return updated;
    } catch (error) {
      getServiceLogger("TaskAnswerService").error(
        "Error updating task answer",
        error
      );
      throw error;
    }
  }

  static async deleteTaskAnswer(id: string): Promise<void> {
    try {
      const toDelete = await DataStore.query(TaskAnswer, id);
      if (!toDelete) {
        throw new Error(`TaskAnswer with id ${id} not found`);
      }

      await DataStore.delete(toDelete);
    } catch (error) {
      getServiceLogger("TaskAnswerService").error(
        "Error deleting task answer",
        error
      );
      throw error;
    }
  }

  static subscribeTaskAnswers(
    callback: (items: TaskAnswer[], isSynced: boolean) => void
  ): {
    unsubscribe: () => void;
  } {
    getServiceLogger("TaskAnswerService").info(
      "Setting up DataStore subscription for TaskAnswer"
    );

    const filterNotDeleted = (items: TaskAnswer[]): TaskAnswer[] => {
      return items.filter(item => (item as any)?._deleted !== true);
    };

    // Track the last known sync state from observeQuery
    let lastKnownSyncState = false;

    const querySubscription = DataStore.observeQuery(TaskAnswer).subscribe(
      snapshot => {
        const { items, isSynced } = snapshot;
        const visibleItems = filterNotDeleted(items);

        // Update the last known sync state
        lastKnownSyncState = isSynced;

        logWithDevice(
          "TaskAnswerService",
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
          "TaskAnswerService",
          "DataStore subscription error",
          error
        );
        callback([], false);
      }
    );

    // Also observe DELETE operations to ensure deletions trigger updates
    const deleteObserver = DataStore.observe(TaskAnswer).subscribe(
      msg => {
        if (msg.opType === OpType.DELETE) {
          const element = msg.element as any;
          const isLocalDelete = element?._deleted === true;
          const source = isLocalDelete
            ? OperationSource.LOCAL
            : OperationSource.REMOTE_SYNC;

          logWithDevice(
            "TaskAnswerService",
            `DELETE operation detected (${source})`,
            {
              taskAnswerId: element?.id,
              taskId: element?.taskId,
              deleted: element?._deleted,
              operationType: msg.opType,
            }
          );

          DataStore.query(TaskAnswer)
            .then(answers => {
              const visibleAnswers = filterNotDeleted(answers);
              logWithDevice(
                "TaskAnswerService",
                "Query refresh after DELETE completed",
                {
                  remainingAnswerCount: visibleAnswers.length,
                  isSynced: lastKnownSyncState,
                }
              );
              // Use the last known sync state instead of hardcoding true
              callback(visibleAnswers, lastKnownSyncState);
            })
            .catch(err => {
              logErrorWithDevice(
                "TaskAnswerService",
                "Error refreshing after delete",
                err
              );
            });
        }
      },
      error => {
        logErrorWithDevice("TaskAnswerService", "DELETE observer error", error);
      }
    );

    return {
      unsubscribe: () => {
        logWithDevice("TaskAnswerService", "Unsubscribing from DataStore");
        querySubscription.unsubscribe();
        deleteObserver.unsubscribe();
      },
    };
  }

  /**
   * Delete all TaskAnswers
   * @returns {Promise<number>} - The number of task answers deleted
   */
  static async deleteAllTaskAnswers(): Promise<number> {
    try {
      const answers = await DataStore.query(TaskAnswer);
      let deletedCount = 0;

      for (const answer of answers) {
        await DataStore.delete(answer);
        deletedCount++;
      }

      getServiceLogger("TaskAnswerService").info("Deleted all task answers", {
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      getServiceLogger("TaskAnswerService").error(
        "Error deleting all task answers",
        error
      );
      throw error;
    }
  }

  static async clearDataStore(): Promise<void> {
    try {
      await DataStore.clear();
    } catch (error) {
      getServiceLogger("TaskAnswerService").error(
        "Error clearing DataStore",
        error
      );
      throw error;
    }
  }
}
