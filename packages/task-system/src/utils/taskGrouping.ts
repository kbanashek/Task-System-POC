import { Task } from "@task-types/Task";
import {
  getTaskExpirationWithRecall,
  getTimeInMinutes,
  isTaskInRecallPeriod,
} from "@utils/taskFiltering";

export const groupTasksByDueByLabel = (tasks: Task[]) => {
  if (!tasks || tasks.length === 0) return {};

  return tasks.reduce<Record<string, Task[]>>((acc, task) => {
    const taskCopy: any = { ...task };

    let groupByDueByLabel = taskCopy.dueByLabel;

    if (!groupByDueByLabel && taskCopy.expireTimeInMillSec) {
      const expireDate = new Date(taskCopy.expireTimeInMillSec);
      const hours = expireDate.getHours();
      const minutes = expireDate.getMinutes();
      const isPM = hours >= 12;
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
      groupByDueByLabel = `${displayHours}:${displayMinutes} ${isPM ? "PM" : "AM"}`;
    }

    if (!groupByDueByLabel) groupByDueByLabel = "no-time";

    if (isTaskInRecallPeriod(taskCopy)) {
      const expirationWithRecall = getTaskExpirationWithRecall(taskCopy);
      if (expirationWithRecall) {
        const recallDate = new Date(expirationWithRecall);
        const hours = recallDate.getHours();
        const minutes = recallDate.getMinutes();
        const isPM = hours >= 12;
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
        groupByDueByLabel = `${displayHours}:${displayMinutes} ${isPM ? "PM" : "AM"}`;
        taskCopy.dueByUpdated = recallDate;
      } else {
        taskCopy.dueByUpdated = undefined;
      }
    } else {
      if (taskCopy.expireTimeInMillSec) {
        taskCopy.dueByUpdated = new Date(taskCopy.expireTimeInMillSec);
      }
    }

    acc[groupByDueByLabel] = [...(acc[groupByDueByLabel] || []), taskCopy];
    return acc;
  }, {});
};

export const sortTaskGroups = (taskGroups: Record<string, Task[]>) => {
  const sortedKeys = Object.keys(taskGroups).sort((a, b) => {
    const aHasRecall = taskGroups[a]?.some(t => isTaskInRecallPeriod(t));
    const bHasRecall = taskGroups[b]?.some(t => isTaskInRecallPeriod(t));
    if (aHasRecall && !bHasRecall) return -1;
    if (!aHasRecall && bHasRecall) return 1;
    return getTimeInMinutes(a) - getTimeInMinutes(b);
  });

  return sortedKeys.map(key => [key, taskGroups[key]] as [string, Task[]]);
};

export const groupAndSortTasks = (tasks: Task[]) => {
  const grouped = groupTasksByDueByLabel(tasks);
  const sorted = sortTaskGroups(grouped);
  return sorted.map(([timeLabel, groupTasks]) => ({
    timeLabel,
    tasks: groupTasks,
    hasRecall: groupTasks.some(t => isTaskInRecallPeriod(t)),
  }));
};

export default groupTasksByDueByLabel;
