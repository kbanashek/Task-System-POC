/**
 * Unit tests for episodicTaskFiltering utilities - LX Parity
 */

import { Task, TaskStatus, TaskType } from "@task-types/Task";
import {
  filterEpisodicTasks,
  sortEpisodicTasks,
} from "../episodicTaskFiltering";

describe("episodicTaskFiltering", () => {
  const now = Date.now();

  const createEpisodicTask = (overrides: Partial<Task> = {}): Task => ({
    id: `episodic-${Date.now()}-${Math.random()}`,
    pk: "EPISODIC-PK",
    sk: "SK",
    title: "Episodic Task",
    status: TaskStatus.OPEN,
    taskType: TaskType.EPISODIC,
    startTimeInMillSec: now,
    expireTimeInMillSec: 0,
    ...overrides,
  });

  describe("filterEpisodicTasks", () => {
    it("filters out non-EPISODIC tasks", () => {
      const episodic = createEpisodicTask();
      const scheduled = createEpisodicTask({
        taskType: TaskType.SCHEDULED,
      });

      const filtered = filterEpisodicTasks([episodic, scheduled], now);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].taskType).toBe(TaskType.EPISODIC);
    });

    it("filters out hidden episodic tasks (isHidden=true)", () => {
      const visible = createEpisodicTask({ isHidden: false });
      const hidden = createEpisodicTask({ isHidden: true });

      const filtered = filterEpisodicTasks([visible, hidden], now);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(visible.id);
    });

    it("includes episodic tasks with isHidden=false", () => {
      const task = createEpisodicTask({ isHidden: false });

      const filtered = filterEpisodicTasks([task], now);

      expect(filtered).toHaveLength(1);
    });

    it("includes episodic tasks with null/undefined isHidden", () => {
      const task = createEpisodicTask({ isHidden: undefined });

      const filtered = filterEpisodicTasks([task], now);

      expect(filtered).toHaveLength(1);
    });

    it("filters out tasks with etci.endedAt in the past", () => {
      const pastDate = new Date(now - 1000 * 60 * 60); // 1 hour ago
      const activeTask = createEpisodicTask({
        etci: {
          startedAt: new Date(now).toISOString(),
          endedAt: new Date(now + 1000 * 60 * 60).toISOString(), // 1 hour from now
        },
      });
      const endedTask = createEpisodicTask({
        etci: {
          startedAt: new Date(now).toISOString(),
          endedAt: pastDate.toISOString(),
        },
      });

      const filtered = filterEpisodicTasks([activeTask, endedTask], now);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(activeTask.id);
    });

    it("includes tasks with etci.startedAt but no endedAt", () => {
      const task = createEpisodicTask({
        etci: {
          startedAt: new Date(now).toISOString(),
        },
      });

      const filtered = filterEpisodicTasks([task], now);

      expect(filtered).toHaveLength(1);
    });

    it("filters based on showTask flag when available", () => {
      const shown = createEpisodicTask({ showTask: true });
      const hidden = createEpisodicTask({ showTask: false });

      const filtered = filterEpisodicTasks([shown, hidden], now);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(shown.id);
    });

    it("includes task with null showTask if no other filters apply", () => {
      const task = createEpisodicTask({ showTask: null });

      const filtered = filterEpisodicTasks([task], now);

      expect(filtered).toHaveLength(1);
    });

    it("handles etci as JSON string", () => {
      const task = createEpisodicTask({
        etci: JSON.stringify({
          startedAt: new Date(now).toISOString(),
        }) as any,
      });

      const filtered = filterEpisodicTasks([task], now);

      expect(filtered).toHaveLength(1);
    });

    it("handles empty array", () => {
      const filtered = filterEpisodicTasks([], now);
      expect(filtered).toEqual([]);
    });
  });

  describe("sortEpisodicTasks", () => {
    it("sorts episodic tasks alphabetically by title", () => {
      const task1 = createEpisodicTask({ title: "Zebra Task" });
      const task2 = createEpisodicTask({ title: "Apple Task" });
      const task3 = createEpisodicTask({ title: "Banana Task" });

      const sorted = sortEpisodicTasks([task1, task2, task3]);

      expect(sorted[0].title).toBe("Apple Task");
      expect(sorted[1].title).toBe("Banana Task");
      expect(sorted[2].title).toBe("Zebra Task");
    });

    it("handles empty array", () => {
      const sorted = sortEpisodicTasks([]);
      expect(sorted).toEqual([]);
    });

    it("is case-insensitive", () => {
      const task1 = createEpisodicTask({ title: "zebra" });
      const task2 = createEpisodicTask({ title: "Apple" });

      const sorted = sortEpisodicTasks([task1, task2]);

      expect(sorted[0].title).toBe("Apple");
      expect(sorted[1].title).toBe("zebra");
    });

    it("handles null/undefined titles gracefully", () => {
      const task1 = createEpisodicTask({ title: "Valid" });
      const task2 = createEpisodicTask({ title: null as any });
      const task3 = createEpisodicTask({ title: undefined as any });

      // Should not throw
      expect(() => sortEpisodicTasks([task1, task2, task3])).not.toThrow();
    });

    it("maintains stable sort for identical titles", () => {
      const task1 = createEpisodicTask({ id: "1", title: "Same Title" });
      const task2 = createEpisodicTask({ id: "2", title: "Same Title" });
      const task3 = createEpisodicTask({ id: "3", title: "Same Title" });

      const sorted = sortEpisodicTasks([task1, task2, task3]);

      // Order should be preserved for identical titles
      expect(sorted[0].id).toBe("1");
      expect(sorted[1].id).toBe("2");
      expect(sorted[2].id).toBe("3");
    });
  });
});
