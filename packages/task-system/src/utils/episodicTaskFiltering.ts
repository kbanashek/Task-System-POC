/**
 * Episodic Task Filtering Utilities - LX Parity
 *
 * Ported from Lumiere/src/components/tasks/EpisodicTasks.tsx
 *
 * Provides episodic task filtering and sorting logic to match LX dashboard behavior.
 */

import { Task, TaskType } from "@task-types/Task";

/**
 * Interface for episodic task control info (etci)
 */
export interface EpisodicTaskControlInfo {
  /** When the task started (ISO string or Date) */
  startedAt?: string | Date | null;
  /** When the task ended (ISO string or Date) */
  endedAt?: string | Date | null;
}

/**
 * Parses etci field from task
 *
 * @param task - The task with etci field
 * @returns Parsed etci object or null if invalid/missing
 */
const parseEtci = (task: Task): EpisodicTaskControlInfo | null => {
  if (!task.etci) {
    return null;
  }

  try {
    if (typeof task.etci === "string") {
      return JSON.parse(task.etci);
    } else if (typeof task.etci === "object") {
      return task.etci as EpisodicTaskControlInfo;
    }
  } catch {
    // Invalid JSON
    return null;
  }

  return null;
};

/**
 * Filters episodic tasks based on LX business logic
 *
 * Filtering rules (in priority order):
 * 1. Must have taskType === EPISODIC
 * 2. If isHidden is true, filter out
 * 3. If etci has startedAt:
 *    - If etci has endedAt: only show if endedAt is in the future
 *    - If no endedAt: show (started but not ended)
 * 4. If showTask is set, use that value
 * 5. Default: show the task
 *
 * @param tasks - Array of tasks to filter
 * @param currentTime - The current time in milliseconds (defaults to now)
 * @returns Filtered array of episodic tasks
 *
 * @example
 * ```typescript
 * const filtered = filterEpisodicTasks(allTasks, Date.now());
 * ```
 */
export const filterEpisodicTasks = (
  tasks: Task[],
  currentTime: number = Date.now()
): Task[] => {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  const currentDate = new Date(currentTime);

  return tasks.filter((task: Task) => {
    // Check if this is an episodic task by taskType
    if (task.taskType !== TaskType.EPISODIC) {
      return false;
    }

    // Prioritize isHidden over other conditions. If task is hidden, don't show it.
    if (task.isHidden != null && task.isHidden) {
      return false;
    }

    // Handle etci parsing with error handling
    const etci = parseEtci(task);

    if (etci && etci.startedAt != null) {
      // Task has started - check if it has ended
      if (etci.endedAt != null) {
        // Task has both started and ended - hide if ended in the past
        const endAt = new Date(etci.endedAt);
        const shouldShow = endAt > currentDate;

        return shouldShow; // Only show if still active (endedAt in future)
      } else {
        // Task has started but not ended - should show
        return true;
      }
    }

    // Check showTask flag
    if (task.showTask != null) {
      return task.showTask;
    }

    // Default: show the task
    return true;
  });
};

/**
 * Sorts episodic tasks alphabetically by title
 *
 * @param tasks - Array of episodic tasks to sort
 * @returns New array sorted by title (case-insensitive)
 *
 * @example
 * ```typescript
 * const sorted = sortEpisodicTasks(episodicTasks);
 * ```
 */
export const sortEpisodicTasks = (tasks: Task[]): Task[] => {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  return [...tasks].sort((a, b) => {
    return (a.title || "").localeCompare(b.title || "");
  });
};

/**
 * Filters and sorts episodic tasks in a single operation
 *
 * Convenience function that combines filterEpisodicTasks and sortEpisodicTasks.
 *
 * @param tasks - Array of tasks to filter and sort
 * @param currentTime - The current time in milliseconds (defaults to now)
 * @returns Filtered and sorted array of episodic tasks
 *
 * @example
 * ```typescript
 * const episodic = filterAndSortEpisodicTasks(allTasks, Date.now());
 * ```
 */
export const filterAndSortEpisodicTasks = (
  tasks: Task[],
  currentTime: number = Date.now()
): Task[] => {
  const filtered = filterEpisodicTasks(tasks, currentTime);
  return sortEpisodicTasks(filtered);
};
