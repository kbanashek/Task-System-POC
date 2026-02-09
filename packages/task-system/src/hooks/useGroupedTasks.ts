import { Task, TaskType } from "@task-types/Task";
import { filterAndSortEpisodicTasks } from "@utils/episodicTaskFiltering";
import { shouldFilterTask, sortTaskArray } from "@utils/taskFiltering";
import { groupTasksByDueByLabel, sortTaskGroups } from "@utils/taskGrouping";
import React from "react";

/**
 * Represents a group of tasks organized by day and time.
 */
export interface GroupedTask {
  /** Human-readable day label (e.g., "Today", "Tomorrow", "Monday") */
  dayLabel: string;
  /** Date string in YYYY-MM-DD format */
  dayDate: string;
  /** Tasks without a specific start time (episodic tasks) */
  tasksWithoutTime: Task[];
  /** Tasks grouped by their due time label (dueByLabel) */
  timeGroups: { time: string; tasks: Task[] }[];
}

/**
 * React hook for grouping tasks by day and time - LX Parity
 *
 * Groups tasks into a hierarchical structure organized by:
 * 1. Day (Today, Tomorrow, or weekday name)
 * 2. Time within each day (by dueByLabel, not expireTimeInMillSec)
 *
 * Implements full LX parity:
 * - Episodic tasks filtered by isHidden, etci, showTask
 * - Episodic tasks sorted alphabetically and rendered first
 * - Scheduled/Timed tasks filtered by shouldFilterTask (completed, expired, not started, old tasks)
 * - Scheduled/Timed tasks sorted by startTimeInMillSec then title
 * - Scheduled/Timed tasks grouped by dueByLabel
 * - Recall tasks prioritized in group sorting
 *
 * @param tasks - Array of tasks to group
 * @returns Array of grouped task objects, one per day
 *
 * @example
 * ```tsx
 * const groupedTasks = useGroupedTasks(tasks);
 *
 * // Render grouped tasks
 * groupedTasks.map(group => (
 *   <View key={group.dayDate}>
 *     <Text>{group.dayLabel}</Text>
 *     {group.tasksWithoutTime.map(task => <TaskCard task={task} />)} // Episodic first
 *     {group.timeGroups.map(timeGroup => (
 *       <View key={timeGroup.time}>
 *         <Text>{timeGroup.time}</Text>
 *         {timeGroup.tasks.map(task => <TaskCard task={task} />)}
 *       </View>
 *     ))}
 *   </View>
 * ));
 * ```
 */
/** React hook that groups tasks by day and due-by time label (LX parity). */
export const useGroupedTasks = (tasks: Task[]): GroupedTask[] => {
  const currentTime = React.useMemo(() => Date.now(), []);

  return React.useMemo(() => {
    // Commented out for less log noise - uncomment to debug task grouping
    // console.warn("[useGroupedTasks] 🚀 Starting LX-parity task grouping", {
    //   totalTasks: tasks.length,
    //   episodicCount: tasks.filter(t => t.taskType === TaskType.EPISODIC).length,
    //   scheduledCount: tasks.filter(t => t.taskType === TaskType.SCHEDULED)
    //     .length,
    //   timedCount: tasks.filter(t => t.taskType === TaskType.TIMED).length,
    // });

    // 1. Separate episodic and scheduled/timed tasks
    const episodicTasks = tasks.filter(t => t.taskType === TaskType.EPISODIC);
    const scheduledTasks = tasks.filter(t => t.taskType !== TaskType.EPISODIC);

    // 2. Filter episodic tasks (LX parity: isHidden, etci, showTask)
    const filteredEpisodicTasks = filterAndSortEpisodicTasks(
      episodicTasks,
      currentTime
    );

    // console.warn("[useGroupedTasks] ✅ Filtered episodic tasks", {
    //   before: episodicTasks.length,
    //   after: filteredEpisodicTasks.length,
    //   tasks: filteredEpisodicTasks.map(t => t.title),
    // });

    // 3. Filter scheduled/timed tasks (LX parity: completed, expired, not started, old tasks)
    const filteredScheduledTasks = scheduledTasks.filter(
      task => !shouldFilterTask(task, currentTime)
    );

    // console.warn("[useGroupedTasks] ✅ Filtered scheduled tasks", {
    //   before: scheduledTasks.length,
    //   after: filteredScheduledTasks.length,
    // });

    // 4. Sort scheduled tasks by startTimeInMillSec then title
    const sortedScheduledTasks = sortTaskArray(filteredScheduledTasks);

    // 5. Group by date (today, tomorrow, future)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tasksByDate: { [dateKey: string]: Task[] } = {};

    sortedScheduledTasks.forEach(task => {
      let taskDate: Date;
      if (task.expireTimeInMillSec) {
        taskDate = new Date(task.expireTimeInMillSec);
      } else if (task.startTimeInMillSec) {
        taskDate = new Date(task.startTimeInMillSec);
      } else {
        // No timestamp - default to today
        taskDate = now;
      }

      // Use local date, not UTC
      const taskDay = new Date(
        taskDate.getFullYear(),
        taskDate.getMonth(),
        taskDate.getDate()
      );
      // Format as YYYY-MM-DD in LOCAL timezone (not UTC)
      const year = taskDay.getFullYear();
      const month = String(taskDay.getMonth() + 1).padStart(2, "0");
      const day = String(taskDay.getDate()).padStart(2, "0");
      const dayKey = `${year}-${month}-${day}`;

      if (!tasksByDate[dayKey]) {
        tasksByDate[dayKey] = [];
      }
      tasksByDate[dayKey].push(task);
    });

    // 6. For each date, group by dueByLabel and sort groups
    const groupedByDate = Object.entries(tasksByDate)
      .sort(([dateA], [dateB]) => {
        // Sort dates chronologically
        return dateA.localeCompare(dateB);
      })
      .map(([dateStr, dateTasks]) => {
        // Parse YYYY-MM-DD as LOCAL date (not UTC)
        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        const diffDays = Math.floor(
          (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Format day label
        let dayLabel: string;
        let dayDate: string;

        if (diffDays === 0) {
          dayLabel = "Today";
          dayDate = now.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
        } else if (diffDays === 1) {
          dayLabel = "Tomorrow";
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          dayDate = tomorrow.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
        } else {
          dayDate = date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          dayLabel = dayDate;
        }

        // Group by dueByLabel
        const taskGroups = groupTasksByDueByLabel(dateTasks);
        const sortedGroups = sortTaskGroups(taskGroups);

        // Format time groups
        const timeGroups = sortedGroups.map(([timeLabel, groupTasks]) => ({
          time: timeLabel,
          tasks: groupTasks,
        }));

        return {
          dayLabel,
          dayDate,
          tasksWithoutTime: diffDays === 0 ? filteredEpisodicTasks : [], // Episodic tasks only show in "today"
          timeGroups,
        };
      });

    // If today has no scheduled tasks, still create a "Today" group for episodic tasks
    const hasTodayGroup = groupedByDate.some(g => g.dayLabel === "Today");

    if (!hasTodayGroup && filteredEpisodicTasks.length > 0) {
      groupedByDate.unshift({
        dayLabel: "Today",
        dayDate: now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        tasksWithoutTime: filteredEpisodicTasks,
        timeGroups: [],
      });
    }

    // console.warn("[useGroupedTasks] ✅ Final grouped result", {
    //   totalGroups: groupedByDate.length,
    //   groups: groupedByDate.map(g => ({
    //     dayLabel: g.dayLabel,
    //     episodicCount: g.tasksWithoutTime.length,
    //     timeGroupsCount: g.timeGroups.length,
    //     firstEpisodic: g.tasksWithoutTime[0]?.title,
    //   })),
    // });

    return groupedByDate;
  }, [tasks, currentTime]);
};
