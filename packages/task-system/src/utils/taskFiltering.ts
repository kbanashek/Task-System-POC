/**
 * Task Filtering Utilities - LX Parity
 *
 * Ported from Lumiere/src/components/tasks/hooks/useTodayTasks.ts
 * and Lumiere/src/utils/task/taskAgeFilter.ts
 *
 * Provides filtering and sorting logic to match LX dashboard behavior.
 */

import { Task, TaskStatus, TaskType } from "@task-types/Task";

/**
 * Completed or expired task statuses that should be filtered out
 */
const COMPLETED_OR_EXPIRED_STATUSES = [
  TaskStatus.COMPLETED,
  TaskStatus.EXPIRED,
];

/**
 * Default age threshold for filtering old timed tasks (in hours)
 * Tasks older than this will be filtered out
 */
export const DEFAULT_TIMED_TASK_AGE_THRESHOLD_HOURS = 24;

/**
 * Sorts an array of tasks by their start time and title
 *
 * @param taskList - The list of tasks to sort
 * @returns A new sorted array of tasks
 *
 * @example
 * ```typescript
 * const sorted = sortTaskArray(tasks);
 * ```
 */
export const sortTaskArray = (taskList: Task[] | undefined): Task[] => {
  if (!taskList) {
    return [];
  }
  const sortedList = [...taskList];
  sortedList.sort((task1: Task, task2: Task) => {
    if ((task1.startTimeInMillSec || 0) > (task2.startTimeInMillSec || 0))
      return 1;
    if ((task1.startTimeInMillSec || 0) < (task2.startTimeInMillSec || 0))
      return -1;
    if (task1.title > task2.title) return 1;
    if (task1.title < task2.title) return -1;
    return 0;
  });
  return sortedList;
};

/**
 * Helper function to convert time label to minutes for sorting
 *
 * @param timeLabel - Time label to convert (e.g., "11:00 AM", "2:30 PM")
 * @returns Time in minutes for comparison
 *
 * @example
 * ```typescript
 * getTimeInMinutes("11:30 AM") // Returns 690 (11 * 60 + 30)
 * getTimeInMinutes("2:00 PM") // Returns 840 (14 * 60)
 * ```
 */
export const getTimeInMinutes = (timeLabel: string): number => {
  if (!timeLabel || timeLabel === "no-time") return Number.MAX_SAFE_INTEGER;

  const timeMatch = timeLabel.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([AP]M)?$/i);
  if (!timeMatch) return Number.MAX_SAFE_INTEGER;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const isPM = /PM/i.test(timeMatch[3] || "");

  if (isNaN(hours) || hours > 12 || hours < 1) return Number.MAX_SAFE_INTEGER;
  if (isNaN(minutes) || minutes >= 60) return Number.MAX_SAFE_INTEGER;

  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

/**
 * Extracts the creation timestamp from a task ID
 *
 * Task IDs follow the format: "{ISO_TIMESTAMP}#{TASK_PK}"
 * Example: "2025-10-17T16:30:27.159Z#Task.c15f874a-a9cb-4f0a-af04-88bc05448765"
 *
 * @param taskId - The task ID to parse
 * @returns The creation date as a Date object, or null if parsing fails
 */
export const getTaskCreationDate = (taskId: string): Date | null => {
  if (!taskId || typeof taskId !== "string") {
    return null;
  }

  try {
    const taskIdParts = taskId.split("#");
    if (taskIdParts.length > 0) {
      const creationTimestamp = taskIdParts[0];
      const creationDate = new Date(creationTimestamp);

      // Validate the date is valid
      if (isNaN(creationDate.getTime())) {
        return null;
      }

      return creationDate;
    }
  } catch {
    // Silently handle parse errors - task ID might not follow expected format
  }

  return null;
};

/**
 * Calculates the age of a task in hours
 *
 * @param taskId - The task ID containing the creation timestamp
 * @param currentTime - The current time in milliseconds (defaults to now)
 * @returns The age in hours, or null if calculation fails
 */
export const getTaskAgeInHours = (
  taskId: string,
  currentTime: number = Date.now()
): number | null => {
  const creationDate = getTaskCreationDate(taskId);

  if (!creationDate) {
    return null;
  }

  const ageInMilliseconds = currentTime - creationDate.getTime();
  const ageInHours = ageInMilliseconds / (60 * 60 * 1000);

  return ageInHours;
};

/**
 * Determines if a TIMED task is older than the specified threshold
 *
 * Only applies to TIMED tasks. Other task types return false.
 * Tasks with noEndTime=true are never filtered by age.
 *
 * @param task - The task to check
 * @param currentTime - The current time in milliseconds (defaults to now)
 * @param thresholdHours - The age threshold in hours (defaults to 24)
 * @returns true if the task is a TIMED task older than the threshold, false otherwise
 */
export const isTimedTaskOlderThanThreshold = (
  task: Task,
  currentTime: number = Date.now(),
  thresholdHours: number = DEFAULT_TIMED_TASK_AGE_THRESHOLD_HOURS
): boolean => {
  // Only filter TIMED tasks by age
  if (!task || task.taskType !== TaskType.TIMED) {
    return false;
  }

  // Tasks with noEndTime never expire by age
  if (task.noEndTime) {
    return false;
  }

  const ageInHours = getTaskAgeInHours(task.id, currentTime);

  if (ageInHours === null) {
    // If we can't determine age, don't filter
    return false;
  }

  return ageInHours > thresholdHours;
};

/**
 * Checks if a task has recall period configured
 *
 * @param task - The task to check
 * @returns true if task has canRecall configured
 */
const determineTaskRecall = (task: Task): boolean => {
  return task.canRecall != null && task.canRecall !== undefined;
};

/**
 * Gets the task recall time in milliseconds
 *
 * @param task - The task to check
 * @returns Recall time in milliseconds
 */
const getTaskRecallTimeInMilliSeconds = (task: Task): number => {
  return task.canRecall ? task.canRecall * 60 * 1000 : 0;
};

/**
 * Checks if a task is currently in its recall period
 *
 * A task is in recall period if:
 * - It has canRecall configured
 * - Current time is past the expiration date
 * - For SCHEDULED tasks: always check
 * - For TIMED tasks: only if startTimeInMillSec !== 0
 *
 * @param task - The task to check
 * @returns true if the task is in recall period, false otherwise
 */
export const isTaskInRecallPeriod = (task: Task): boolean => {
  const currentTime = Date.now();

  // Check if task has recall configured
  if (!determineTaskRecall(task)) {
    return false;
  }

  // Get expiration time
  let expireTime: number | null = null;
  if (task.expireTimeInMillSec) {
    expireTime = task.expireTimeInMillSec;
  } else if (task.dueByUpdated) {
    const dueByDate =
      typeof task.dueByUpdated === "string"
        ? new Date(task.dueByUpdated)
        : task.dueByUpdated;
    expireTime = dueByDate.getTime();
  }

  if (!expireTime) {
    return false;
  }

  // Check if current time is past expiration
  const isPastExpiration = currentTime > expireTime;

  // For SCHEDULED tasks, always check if past expiration
  if (task.taskType === TaskType.SCHEDULED) {
    return isPastExpiration;
  }

  // For TIMED tasks, only check if task was started (startTimeInMillSec !== 0)
  if (task.taskType === TaskType.TIMED) {
    return isPastExpiration && task.startTimeInMillSec !== 0;
  }

  return false;
};

/**
 * Gets the task expiration time with recall period added
 *
 * @param task - The task to check
 * @returns Expiration time with recall in milliseconds, or null if not available
 */
export const getTaskExpirationWithRecall = (task: Task): number | null => {
  let expireTime: number | null = null;

  if (task.expireTimeInMillSec) {
    expireTime = task.expireTimeInMillSec;
  } else if (task.dueByUpdated) {
    const dueByDate =
      typeof task.dueByUpdated === "string"
        ? new Date(task.dueByUpdated)
        : task.dueByUpdated;
    expireTime = dueByDate.getTime();
  }

  if (!expireTime) {
    return null;
  }

  return expireTime + getTaskRecallTimeInMilliSeconds(task);
};

/**
 * Determines if a task should be filtered out from rendering on dashboard
 *
 * Filters out tasks that are:
 * - Completed or expired
 * - Not started yet (when showBeforeStart is false)
 * - Expired (for regular tasks)
 * - Old timed tasks beyond age threshold
 *
 * Special handling for noEndTime tasks:
 * - Never filtered by expiration or age
 * - Only filtered if completed or not started
 *
 * @param task - The task to check
 * @param currentTime - The current time in milliseconds
 * @returns true if the task should be filtered out, false otherwise
 *
 * @example
 * ```typescript
 * const currentTime = Date.now();
 * const shouldHide = shouldFilterTask(task, currentTime);
 * ```
 */
export const shouldFilterTask = (task: Task, currentTime: number): boolean => {
  const isCompletedOrExpired = COMPLETED_OR_EXPIRED_STATUSES.includes(
    task.status
  );
  const notStarted =
    !task.showBeforeStart && (task.startTimeInMillSec || 0) > currentTime;
  const hasExpired = (task.expireTimeInMillSec || 0) < currentTime;

  // Only apply age-based filtering to tasks that are not noEndTime
  const isOldTimedTask =
    !task.noEndTime &&
    hasExpired &&
    isTimedTaskOlderThanThreshold(task, currentTime);

  if (task.noEndTime) {
    // Filter out the task if it is never started
    if (task.startTimeInMillSec === 0) {
      return true;
    }
    // Tasks with noEndTime never expire - only filter by completion status or if not started
    return isCompletedOrExpired || notStarted;
  } else {
    // Regular tasks can be filtered by expiration and age
    return isCompletedOrExpired || notStarted || hasExpired || isOldTimedTask;
  }
};

/**
 * Checks if a task group is valid (contains at least one non-filtered task)
 *
 * @param taskGroup - The task group to check
 * @param groupName - The name of the group to check
 * @param currentTime - The current time in milliseconds
 * @returns true if the group is valid, false otherwise
 */
export const isValidTaskGroup = (
  taskGroup: { [key: string]: Task[] },
  groupName: string,
  currentTime: number
): boolean => {
  if (
    !taskGroup ||
    !taskGroup[groupName] ||
    taskGroup[groupName].length === 0
  ) {
    return false;
  }

  return taskGroup[groupName].some(
    task => !shouldFilterTask(task, currentTime)
  );
};

/**
 * Type definition for canRecall field (in minutes)
 */
declare module "@task-types/Task" {
  interface Task {
    canRecall?: number | null;
  }
}
