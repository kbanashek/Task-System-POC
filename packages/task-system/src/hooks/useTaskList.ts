import { useEffect, useMemo, useRef, useState } from "react";
import { useAmplify } from "@contexts/AmplifyContext";
import { TaskService } from "@services/TaskService";
import { Task, TaskFilters, TaskType } from "@task-types/Task";
import { NetworkStatus } from "@hooks/useAmplifyState";
import {
  logWithPlatform,
  logErrorWithPlatform,
} from "@utils/logging/platformLogger";
import { dataSubscriptionLogger } from "@utils/logging/dataSubscriptionLogger";

/**
 * Return type for the useTaskList hook.
 */
interface UseTaskListReturn {
  /** Filtered list of tasks based on provided filters */
  tasks: Task[];
  /** Whether initial data is still loading */
  loading: boolean;
  /** Error message from the most recent operation, or null */
  error: string | null;
  /** Whether data is synchronized with the cloud */
  isSynced: boolean;
  /** Whether the device is online */
  isOnline: boolean;
  /** Deletes a task by ID */
  handleDeleteTask: (id: string) => Promise<void>;
  /** Retries loading after an error */
  retryLoading: () => void;
  /** Clears all data from the local DataStore */
  clearDataStore: () => Promise<void>;
  /** Manually refreshes the task list */
  refreshTasks: () => Promise<void>;
}

/**
 * React hook for managing tasks with real-time synchronization and filtering.
 *
 * Provides reactive task data via DataStore subscriptions, filtering capabilities,
 * and task management operations. Tasks are automatically updated when changes
 * occur in the DataStore.
 *
 * @param filters - Optional filters to apply to the task list (status, date range, etc.)
 * @returns Object containing task data, loading states, and management operations
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { tasks, loading, error } = useTaskList();
 *
 * // With filters
 * const { tasks } = useTaskList({
 *   status: TaskStatus.OPEN,
 *   startDate: new Date(),
 * });
 *
 * // Delete a task
 * await handleDeleteTask("task-123");
 * ```
 */
/** React hook for managing a list of tasks with live DataStore updates. */
export const useTaskList = (filters?: TaskFilters): UseTaskListReturn => {
  const [allTasks, setAllTasks] = useState<Task[]>([]); // Store unfiltered tasks
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const { networkStatus } = useAmplify();
  const isOnline = networkStatus === NetworkStatus.Online;
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const lastTaskCountRef = useRef<number>(-1);
  const lastSyncedRef = useRef<boolean | null>(null);
  const hasLoggedInitRef = useRef<boolean>(false);
  const lastLoggedStateRef = useRef<string>("");

  const initTasks = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!hasLoggedInitRef.current) {
        dataSubscriptionLogger.logSubscriptionStart("useTaskList", "task");
        hasLoggedInitRef.current = true;
      }

      // Subscribe to changes in tasks - just store data, don't filter
      // Filtering happens in useMemo below
      const sub = TaskService.subscribeTasks((items, synced) => {
        // Only log if task count or sync status actually changed
        const countChanged = items.length !== lastTaskCountRef.current;
        const syncChanged = synced !== lastSyncedRef.current;

        if (countChanged || syncChanged) {
          // Use centralized logger to prevent duplicates across hook instances
          dataSubscriptionLogger.logTasks(
            items.map(t => ({
              title: t.title,
              startTimeInMillSec: t.startTimeInMillSec,
              expireTimeInMillSec: t.expireTimeInMillSec,
            })),
            synced,
            "useTaskList"
          );
          lastTaskCountRef.current = items.length;
          lastSyncedRef.current = synced;
        }

        // Log episodic task detection
        const episodicTasks = items.filter(t => {
          const taskTypeStr = String(t.taskType).toUpperCase();
          return taskTypeStr === "EPISODIC" || t.taskType === TaskType.EPISODIC;
        });
        // Commented out for less log noise - uncomment to debug episodic task detection
        // if (episodicTasks.length > 0) {
        //   console.warn("[useTaskList] 📋 Episodic tasks detected", {
        //     totalTasks: items.length,
        //     episodicCount: episodicTasks.length,
        //     episodicTasks: episodicTasks.map(t => ({
        //       id: t.id,
        //       title: t.title,
        //       taskType: t.taskType,
        //       taskTypeStr: String(t.taskType).toUpperCase(),
        //       expireTimeInMillSec: t.expireTimeInMillSec,
        //     })),
        //   });
        // }

        setAllTasks(items);
        setIsSynced(synced);
        setLoading(false);
      });

      // Ensure we can always unsubscribe on unmount, even if the subscription
      // is created after the first render (avoid stale cleanup closures).
      subscriptionRef.current = sub;
    } catch (err) {
      logErrorWithPlatform(
        "",
        "useTaskList",
        "Failed to initialize tasks",
        err
      );
      setError("Failed to load tasks. Please try again.");
      setLoading(false);
    }
  };

  useEffect(() => {
    initTasks();

    // Cleanup subscription on unmount
    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, []);

  // Memoize filtered tasks - only recalculates when allTasks or filters change
  const tasks = useMemo(() => {
    // Commented out for less log noise - uncomment to debug task filtering
    // console.warn("[useTaskList] 🔄 Filtering tasks", {
    //   totalTasks: allTasks.length,
    //   hasFilters: !!filters,
    //   episodicCount: allTasks.filter(t => {
    //     const taskTypeStr = String(t.taskType).toUpperCase();
    //     return taskTypeStr === "EPISODIC" || t.taskType === TaskType.EPISODIC;
    //   }).length,
    // });

    if (!filters) {
      // console.warn("[useTaskList] ✅ No filters, returning all tasks", {
      //   totalTasks: allTasks.length,
      // });
      return allTasks;
    }

    let filtered = allTasks;

    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status!.includes(task.status));
    }

    // Apply taskType filter
    if (filters.taskType && filters.taskType.length > 0) {
      filtered = filtered.filter(task =>
        filters.taskType!.includes(task.taskType)
      );
    }

    // Apply searchText filter
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        task =>
          task.title.toLowerCase().includes(searchLower) ||
          (task.description &&
            task.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply date range filter
    // Episodic tasks (without startTimeInMillSec) should always pass date filters
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter(task => {
        // Episodic tasks don't have startTimeInMillSec - always include them
        if (!task.startTimeInMillSec) {
          // Check if it's episodic - if so, always include
          const taskTypeStr = String(task.taskType).toUpperCase();
          if (
            taskTypeStr === "EPISODIC" ||
            task.taskType === TaskType.EPISODIC
          ) {
            return true;
          }
          // Non-episodic tasks without startTimeInMillSec are excluded
          return false;
        }

        const taskDate = new Date(task.startTimeInMillSec);

        if (filters.dateFrom && taskDate < filters.dateFrom) {
          return false;
        }

        if (filters.dateTo && taskDate > filters.dateTo) {
          return false;
        }

        return true;
      });
    }

    // Commented out for less log noise - uncomment to debug task filtering
    // console.warn("[useTaskList] ✅ Filtered tasks result", {
    //   beforeFilter: allTasks.length,
    //   afterFilter: filtered.length,
    //   episodicBefore: allTasks.filter(t => {
    //     const taskTypeStr = String(t.taskType).toUpperCase();
    //     return taskTypeStr === "EPISODIC" || t.taskType === TaskType.EPISODIC;
    //   }).length,
    //   episodicAfter: filtered.filter(t => {
    //     const taskTypeStr = String(t.taskType).toUpperCase();
    //     return taskTypeStr === "EPISODIC" || t.taskType === TaskType.EPISODIC;
    //   }).length,
    // });

    return filtered;
  }, [allTasks, filters]);

  const handleDeleteTask = async (id: string): Promise<void> => {
    try {
      await TaskService.deleteTask(id);
      // The subscription will automatically update the UI
    } catch (err) {
      logErrorWithPlatform("", "useTaskList", "Error deleting task", err);
      setError("Failed to delete task. Please try again.");
    }
  };

  const retryLoading = () => {
    setLoading(true);
    setError(null);
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    initTasks();
  };

  const refreshTasks = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await TaskService.getTasks(filters);
      setAllTasks(fetchedTasks);
      setLoading(false);
    } catch (err) {
      logErrorWithPlatform("", "useTaskList", "Error refreshing tasks", err);
      setError("Failed to refresh tasks. Please try again.");
      setLoading(false);
    }
  };

  const clearDataStore = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;

      await TaskService.clearDataStore();

      await initTasks();
    } catch (err) {
      logErrorWithPlatform("", "useTaskList", "Error clearing DataStore", err);
      setError("Failed to clear DataStore. Please try again.");
      setLoading(false);
    }
  };

  return {
    tasks,
    loading,
    error,
    isSynced,
    isOnline,
    handleDeleteTask,
    retryLoading,
    clearDataStore,
    refreshTasks,
  };
};
