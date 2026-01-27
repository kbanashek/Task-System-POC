import { DataStore } from "@aws-amplify/datastore";
import { Task as DataStoreTask } from "@models/index";
import {
  CreateTaskInput,
  Task,
  TaskFilters,
  TaskStatus,
  TaskType,
  UpdateTaskInput,
} from "@task-types/Task";
import { dataSubscriptionLogger } from "@utils/logging/dataSubscriptionLogger";
import { logWithDevice } from "@utils/logging/deviceLogger";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import {
  createTaskSchema,
  taskFiltersSchema,
  taskIdSchema,
  updateTaskSchema,
  validateOrThrow,
} from "../schemas/taskSchemas";

type TaskUpdateData = Omit<UpdateTaskInput, "id" | "_version">;
type DataStoreTaskInput = ConstructorParameters<typeof DataStoreTask>[0];

export class TaskService {
  /**
   * Create a new Task
   * @param {CreateTaskInput} input - The input data for creating a task
   * @returns {Promise<Task>} - The created task
   * @throws {ValidationError} - If input validation fails
   */
  static async createTask(input: CreateTaskInput): Promise<Task> {
    const logger = getServiceLogger("TaskService");
    try {
      // Validate input before creating task
      const validatedInput = validateOrThrow(
        createTaskSchema,
        input,
        "Task creation"
      );

      logger.info(
        "Creating task via AWS DataStore",
        { title: validatedInput.title },
        "DATA",
        "☁️"
      );
      // Validation ensures required fields exist; cast to DataStoreTask constructor input type
      const task = await DataStore.save(
        new DataStoreTask(validatedInput as DataStoreTaskInput)
      );

      logger.info(
        "Task created successfully in AWS DataStore",
        { id: task.id },
        "DATA",
        "☁️"
      );
      return task as Task;
    } catch (error) {
      logger.error("Failed to create task in AWS DataStore", error, "DATA");
      throw error;
    }
  }

  /**
   * Get all Tasks with optional filters
   * @param {TaskFilters} filters - Optional filters for tasks
   * @returns {Promise<Task[]>} - Array of tasks
   * @throws {ValidationError} - If filters validation fails
   */
  static async getTasks(filters?: TaskFilters): Promise<Task[]> {
    // Validate filters if provided
    if (filters) {
      validateOrThrow(taskFiltersSchema, filters, "Task filters");
    }
    try {
      let tasks = await DataStore.query(DataStoreTask);

      // Apply filters
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          tasks = tasks.filter(task =>
            filters.status!.includes(task.status as TaskStatus)
          );
        }

        if (filters.taskType && filters.taskType.length > 0) {
          tasks = tasks.filter(task =>
            filters.taskType!.includes(task.taskType as TaskType)
          );
        }

        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          tasks = tasks.filter(
            task =>
              task.title?.toLowerCase().includes(searchLower) ||
              (task.description &&
                task.description.toLowerCase().includes(searchLower))
          );
        }

        if (filters.dateFrom || filters.dateTo) {
          tasks = tasks.filter(task => {
            if (!task.startTimeInMillSec) return false;
            const taskDate = new Date(task.startTimeInMillSec);
            if (filters.dateFrom && taskDate < filters.dateFrom) return false;
            if (filters.dateTo && taskDate > filters.dateTo) return false;
            return true;
          });
        }
      }

      return tasks as Task[];
    } catch (error) {
      getServiceLogger("TaskService").error(
        "Failed to fetch tasks from AWS DataStore",
        error,
        "DATA"
      );
      throw error;
    }
  }

  /**
   * Get a Task by ID
   * @param {string} id - The id of the task
   * @returns {Promise<Task | null>} - The task or null if not found
   * @throws {ValidationError} - If ID validation fails
   */
  static async getTaskById(id: string): Promise<Task | null> {
    try {
      // Validate task ID format
      validateOrThrow(taskIdSchema, id, "Task ID");

      const task = await DataStore.query(DataStoreTask, id);
      return (task as Task) || null;
    } catch (error) {
      getServiceLogger("TaskService").error(
        "Failed to fetch task from AWS DataStore",
        error,
        "DATA"
      );
      throw error;
    }
  }

  /**
   * Update a Task
   * @param {string} id - The id of the task to update
   * @param {TaskUpdateData} data - The data to update
   * @returns {Promise<Task>} - The updated task
   * @throws {ValidationError} - If validation fails
   */
  static async updateTask(id: string, data: TaskUpdateData): Promise<Task> {
    const logger = getServiceLogger("TaskService");
    try {
      // Validate task ID format
      validateOrThrow(taskIdSchema, id, "Task ID");

      // Validate update data
      const validatedData = validateOrThrow(
        updateTaskSchema,
        data,
        "Task update"
      );

      logger.info("Updating task in AWS DataStore", { id }, "DATA", "☁️");
      const original = await DataStore.query(DataStoreTask, id);
      if (!original) {
        throw new Error(`Task with id ${id} not found`);
      }

      const updated = await DataStore.save(
        DataStoreTask.copyOf(original, updated => {
          Object.assign(updated, validatedData);
        })
      );

      logger.info(
        "Task updated successfully in AWS DataStore",
        {
          id: updated.id,
          status: updated.status,
        },
        "DATA",
        "☁️"
      );

      return updated as Task;
    } catch (error) {
      logger.error("Failed to update task in AWS DataStore", error, "DATA");
      throw error;
    }
  }

  /**
   * Delete a Task
   * @param {string} id - The id of the task to delete
   * @returns {Promise<void>}
   * @throws {ValidationError} - If ID validation fails
   */
  static async deleteTask(id: string): Promise<void> {
    const logger = getServiceLogger("TaskService");
    try {
      // Validate task ID format
      validateOrThrow(taskIdSchema, id, "Task ID");

      logger.info("Deleting task from AWS DataStore", { id }, "DATA", "☁️");
      const toDelete = await DataStore.query(DataStoreTask, id);
      if (!toDelete) {
        throw new Error(`Task with id ${id} not found`);
      }

      await DataStore.delete(toDelete);
      logger.info(
        "Task deleted successfully from AWS DataStore",
        { id },
        "DATA",
        "☁️"
      );
    } catch (error) {
      logger.error("Failed to delete task from AWS DataStore", error, "DATA");
      throw error;
    }
  }

  /**
   * Subscribe to changes in Task items
   * @param {Function} callback - Function to call when changes occur
   * @returns {Function} - Unsubscribe function
   */
  static subscribeTasks(callback: (items: Task[], isSynced: boolean) => void): {
    unsubscribe: () => void;
  } {
    // Use centralized logger to prevent duplicate subscription setup logs
    dataSubscriptionLogger.logServiceSetup(
      "TaskService",
      "Setting up AWS DataStore subscription for Task model",
      "☁️"
    );

    const logger = getServiceLogger("TaskService");

    // CRITICAL: Do an initial query to ensure tasks are loaded immediately
    // observeQuery may not fire immediately, so we query first to populate the UI
    DataStore.query(DataStoreTask)
      .then(initialTasks => {
        // Use centralized logger to prevent duplicate initial query logs
        dataSubscriptionLogger.logInitialQuery(
          "TaskService",
          "tasks",
          initialTasks.length
        );
        // Call callback with initial data - assume synced if we got data
        callback(initialTasks as Task[], initialTasks.length > 0);
      })
      .catch(err => {
        logger.error("Initial AWS DataStore query failed", err);
        // Still set up subscription even if initial query fails
        callback([], false);
      });

    // Use observeQuery for the main subscription (filters out deleted items automatically)
    // This handles all local and remote operations reliably
    const querySubscription = DataStore.observeQuery(DataStoreTask).subscribe(
      snapshot => {
        const { items, isSynced } = snapshot;

        // Only log in development to reduce production overhead
        if (__DEV__) {
          logger.debug(
            `AWS DataStore subscription update - ${items.length} tasks`,
            {
              synced: isSynced ? "cloud-synced" : "local-only",
            },
            undefined,
            "☁️"
          );
        }

        callback(items as Task[], isSynced);
      },
      error => {
        logger.error("AWS DataStore subscription error", error);
        // Provide empty array to prevent app crash
        callback([], false);
      }
    );

    return {
      unsubscribe: () => {
        logWithDevice("TaskService", "Unsubscribing from DataStore");
        querySubscription.unsubscribe();
      },
    };
  }

  /**
   * Delete all Tasks
   * @returns {Promise<number>} - The number of tasks deleted
   */
  static async deleteAllTasks(): Promise<number> {
    const logger = getServiceLogger("TaskService");
    try {
      logger.info(
        "Starting deleteAllTasks operation in AWS DataStore",
        undefined,
        "DATA",
        "☁️"
      );
      const tasks = await DataStore.query(DataStoreTask);
      let deletedCount = 0;

      logger.info(
        `Found ${tasks.length} tasks to delete from AWS DataStore`,
        { count: tasks.length },
        "DATA",
        "☁️"
      );

      // Delete in batches to avoid overwhelming the sync queue
      const batchSize = 10;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);

        await Promise.all(batch.map(task => DataStore.delete(task)));
        deletedCount += batch.length;

        // Small delay between batches to allow sync
        if (i + batchSize < tasks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(
        `Deleted ${deletedCount} tasks from AWS DataStore, waiting for sync`,
        { deletedCount },
        "DATA",
        "☁️"
      );

      // Wait for deletions to sync
      await new Promise(resolve => setTimeout(resolve, 1000));

      logger.info(
        `DeleteAllTasks operation complete - ${deletedCount} tasks deleted`,
        { deletedCount },
        "DATA",
        "☁️"
      );

      return deletedCount;
    } catch (error) {
      logger.error(
        "Failed to delete all tasks from AWS DataStore",
        error,
        "DATA"
      );
      throw error;
    }
  }

  /**
   * Nuclear reset: Delete all task-related submitted data
   * This includes TaskAnswers, TaskResults, TaskHistory, and Tasks
   * @returns {Promise<{ tasks: number; taskAnswers: number; taskResults: number; taskHistories: number }>} - Counts of deleted items
   */
  static async nuclearReset(): Promise<{
    tasks: number;
    taskAnswers: number;
    taskResults: number;
    taskHistories: number;
  }> {
    try {
      // Import services dynamically to avoid circular dependencies
      const { TaskAnswerService } = await import("./TaskAnswerService");
      const { TaskResultService } = await import("./TaskResultService");
      const { TaskHistoryService } = await import("./TaskHistoryService");

      const logger = getServiceLogger("TaskService");
      logger.info(
        "Starting nuclear reset (deleting all task-related data from AWS DataStore)",
        undefined,
        "DATA",
        "☁️"
      );

      // Delete in order: answers, results, histories first, then tasks
      // This ensures we delete dependent data before parent data
      const taskAnswers = await TaskAnswerService.deleteAllTaskAnswers();
      const taskResults = await TaskResultService.deleteAllTaskResults();
      const taskHistories = await TaskHistoryService.deleteAllTaskHistories();
      const tasks = await this.deleteAllTasks();

      logger.info(
        "Nuclear reset completed",
        {
          tasks,
          taskAnswers,
          taskResults,
          taskHistories,
        },
        "DATA",
        "☁️"
      );

      return {
        tasks,
        taskAnswers,
        taskResults,
        taskHistories,
      };
    } catch (error) {
      getServiceLogger("TaskService").error(
        "Failed during nuclear reset",
        error,
        "DATA"
      );
      throw error;
    }
  }

  /**
   * Clear the DataStore completely
   * This will remove all local data and trigger a fresh sync from the server
   * @returns {Promise<void>}
   */
  static async clearDataStore(): Promise<void> {
    const logger = getServiceLogger("TaskService");
    try {
      logger.info("Clearing AWS DataStore", undefined, "DATA", "☁️");
      await DataStore.clear();
      logger.info(
        "AWS DataStore cleared successfully",
        undefined,
        "DATA",
        "☁️"
      );
    } catch (error) {
      logger.error("Failed to clear AWS DataStore", error, "DATA");
      throw error;
    }
  }
}
