/**
 * Unit tests for taskFiltering utilities - LX Parity
 */

import { Task, TaskStatus, TaskType } from "@task-types/Task";
import {
  getTaskAgeInHours,
  getTaskExpirationWithRecall,
  getTimeInMinutes,
  isTaskInRecallPeriod,
  isTimedTaskOlderThanThreshold,
  shouldFilterTask,
  sortTaskArray,
} from "../taskFiltering";

describe("taskFiltering", () => {
  const now = Date.now();
  const oneHourFromNow = now + 1000 * 60 * 60;
  const oneHourAgo = now - 1000 * 60 * 60;
  const oneDayAgo = now - 1000 * 60 * 60 * 24;

  const createTask = (overrides: Partial<Task> = {}): Task => ({
    id: `task-${Date.now()}-${Math.random()}`,
    pk: "TASK-PK",
    sk: "SK",
    title: "Test Task",
    status: TaskStatus.OPEN,
    taskType: TaskType.SCHEDULED,
    startTimeInMillSec: now,
    expireTimeInMillSec: oneHourFromNow,
    ...overrides,
  });

  describe("shouldFilterTask", () => {
    it("filters out COMPLETED tasks", () => {
      const task = createTask({ status: TaskStatus.COMPLETED });
      expect(shouldFilterTask(task, now)).toBe(true);
    });

    it("filters out EXPIRED tasks", () => {
      const task = createTask({ status: TaskStatus.EXPIRED });
      expect(shouldFilterTask(task, now)).toBe(true);
    });

    it("filters out tasks that have not started yet (showBeforeStart=false)", () => {
      const task = createTask({
        showBeforeStart: false,
        startTimeInMillSec: oneHourFromNow,
      });
      expect(shouldFilterTask(task, now)).toBe(true);
    });

    it("includes tasks that have not started yet (showBeforeStart=true)", () => {
      const task = createTask({
        showBeforeStart: true,
        startTimeInMillSec: oneHourFromNow,
        expireTimeInMillSec: now + 1000 * 60 * 60 * 2,
      });
      expect(shouldFilterTask(task, now)).toBe(false);
    });

    it("filters out expired tasks (expireTime in past)", () => {
      const task = createTask({
        expireTimeInMillSec: oneHourAgo,
      });
      expect(shouldFilterTask(task, now)).toBe(true);
    });

    it("includes tasks with noEndTime (even if expired)", () => {
      const task = createTask({
        noEndTime: true,
        expireTimeInMillSec: oneHourAgo,
      });
      expect(shouldFilterTask(task, now)).toBe(false);
    });

    it("filters out noEndTime tasks that never started (startTime=0)", () => {
      const task = createTask({
        noEndTime: true,
        startTimeInMillSec: 0,
      });
      expect(shouldFilterTask(task, now)).toBe(true);
    });

    it("includes active OPEN tasks within time range", () => {
      const task = createTask({
        status: TaskStatus.OPEN,
        startTimeInMillSec: now,
        expireTimeInMillSec: oneHourFromNow,
      });
      expect(shouldFilterTask(task, now)).toBe(false);
    });
  });

  describe("sortTaskArray", () => {
    it("sorts tasks by startTimeInMillSec (ascending)", () => {
      const task1 = createTask({ startTimeInMillSec: now + 1000, title: "B" });
      const task2 = createTask({ startTimeInMillSec: now, title: "A" });
      const task3 = createTask({ startTimeInMillSec: now + 2000, title: "C" });

      const sorted = sortTaskArray([task1, task2, task3]);

      expect(sorted[0].title).toBe("A");
      expect(sorted[1].title).toBe("B");
      expect(sorted[2].title).toBe("C");
    });

    it("sorts by title when startTimeInMillSec is the same", () => {
      const task1 = createTask({ startTimeInMillSec: now, title: "Zebra" });
      const task2 = createTask({ startTimeInMillSec: now, title: "Apple" });
      const task3 = createTask({ startTimeInMillSec: now, title: "Banana" });

      const sorted = sortTaskArray([task1, task2, task3]);

      expect(sorted[0].title).toBe("Apple");
      expect(sorted[1].title).toBe("Banana");
      expect(sorted[2].title).toBe("Zebra");
    });

    it("handles empty array", () => {
      expect(sortTaskArray([])).toEqual([]);
    });

    it("handles undefined", () => {
      expect(sortTaskArray(undefined)).toEqual([]);
    });
  });

  describe("getTimeInMinutes", () => {
    it("converts 11:00 AM to minutes", () => {
      expect(getTimeInMinutes("11:00 AM")).toBe(11 * 60);
    });

    it("converts 2:30 PM to minutes", () => {
      expect(getTimeInMinutes("2:30 PM")).toBe(14 * 60 + 30);
    });

    it("converts 12:00 PM (noon) to minutes", () => {
      expect(getTimeInMinutes("12:00 PM")).toBe(12 * 60);
    });

    it("converts 12:00 AM (midnight) to minutes", () => {
      expect(getTimeInMinutes("12:00 AM")).toBe(0);
    });

    it("returns MAX_SAFE_INTEGER for invalid time", () => {
      expect(getTimeInMinutes("invalid")).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("returns MAX_SAFE_INTEGER for no-time", () => {
      expect(getTimeInMinutes("no-time")).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe("isTaskInRecallPeriod", () => {
    it("returns false if task has no canRecall", () => {
      const task = createTask({
        expireTimeInMillSec: oneHourAgo,
      });
      expect(isTaskInRecallPeriod(task)).toBe(false);
    });

    it("returns true for SCHEDULED task in recall period", () => {
      const task = createTask({
        taskType: TaskType.SCHEDULED,
        canRecall: 60, // 60 minutes recall
        expireTimeInMillSec: oneHourAgo,
      });
      expect(isTaskInRecallPeriod(task)).toBe(true);
    });

    it("returns false for SCHEDULED task not yet expired", () => {
      const task = createTask({
        taskType: TaskType.SCHEDULED,
        canRecall: 60,
        expireTimeInMillSec: oneHourFromNow,
      });
      expect(isTaskInRecallPeriod(task)).toBe(false);
    });

    it("returns true for TIMED task with startTime !== 0 in recall period", () => {
      const task = createTask({
        taskType: TaskType.TIMED,
        canRecall: 60,
        startTimeInMillSec: now,
        expireTimeInMillSec: oneHourAgo,
      });
      expect(isTaskInRecallPeriod(task)).toBe(true);
    });

    it("returns false for TIMED task with startTime = 0 (not started)", () => {
      const task = createTask({
        taskType: TaskType.TIMED,
        canRecall: 60,
        startTimeInMillSec: 0,
        expireTimeInMillSec: oneHourAgo,
      });
      expect(isTaskInRecallPeriod(task)).toBe(false);
    });
  });

  describe("getTaskExpirationWithRecall", () => {
    it("returns null if task has no expireTimeInMillSec", () => {
      const task = createTask({
        expireTimeInMillSec: undefined,
      });
      expect(getTaskExpirationWithRecall(task)).toBeNull();
    });

    it("returns expireTime + recall period", () => {
      const expireTime = now;
      const task = createTask({
        expireTimeInMillSec: expireTime,
        canRecall: 60, // 60 minutes
      });
      const expected = expireTime + 60 * 60 * 1000;
      expect(getTaskExpirationWithRecall(task)).toBe(expected);
    });

    it("uses dueByUpdated if available", () => {
      const expireTime = now;
      const task = createTask({
        expireTimeInMillSec: undefined,
        dueByUpdated: new Date(expireTime),
        canRecall: 30,
      });
      const expected = expireTime + 30 * 60 * 1000;
      expect(getTaskExpirationWithRecall(task)).toBe(expected);
    });
  });

  describe("getTaskAgeInHours", () => {
    it("returns null for task without valid ID format", () => {
      const task = createTask({ id: "invalid-format" });
      expect(getTaskAgeInHours(task.id, now)).toBeNull();
    });

    it("calculates age correctly from ISO timestamp in ID", () => {
      const creationTime = now - 1000 * 60 * 60 * 2; // 2 hours ago
      const taskId = `${new Date(creationTime).toISOString()}#Task.123`;
      const ageHours = getTaskAgeInHours(taskId, now);
      expect(ageHours).toBeCloseTo(2, 1);
    });
  });

  describe("isTimedTaskOlderThanThreshold", () => {
    it("returns false for non-TIMED tasks", () => {
      const task = createTask({
        taskType: TaskType.SCHEDULED,
        id: `${new Date(oneDayAgo).toISOString()}#Task.123`,
        expireTimeInMillSec: oneDayAgo,
      });
      expect(isTimedTaskOlderThanThreshold(task, now, 1)).toBe(false);
    });

    it("returns false for TIMED task with noEndTime", () => {
      const task = createTask({
        taskType: TaskType.TIMED,
        noEndTime: true,
        id: `${new Date(oneDayAgo).toISOString()}#Task.123`,
      });
      expect(isTimedTaskOlderThanThreshold(task, now, 1)).toBe(false);
    });

    it("returns true for TIMED task older than threshold", () => {
      const task = createTask({
        taskType: TaskType.TIMED,
        id: `${new Date(oneDayAgo).toISOString()}#Task.123`,
        expireTimeInMillSec: oneDayAgo,
      });
      expect(isTimedTaskOlderThanThreshold(task, now, 1)).toBe(true);
    });

    it("returns false for TIMED task younger than threshold", () => {
      const task = createTask({
        taskType: TaskType.TIMED,
        id: `${new Date(now).toISOString()}#Task.123`,
        expireTimeInMillSec: now,
      });
      expect(isTimedTaskOlderThanThreshold(task, now, 24)).toBe(false);
    });
  });
});
