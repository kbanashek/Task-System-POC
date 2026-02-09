import { DataStore } from "@aws-amplify/datastore";
import { Task as DataStoreTask } from "@models/index";
import { TaskService } from "@services/TaskService";
import { Task, TaskStatus, TaskType, CreateTaskInput } from "@task-types/Task";

jest.mock("@aws-amplify/datastore");

/**
 * Creates a mock Task object for testing purposes.
 *
 * @param overrides - Partial Task properties to override defaults
 * @returns A complete Task object with test defaults
 * @example
 * const task = createMockTask({ title: "Custom Title" });
 */
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  pk: "test-pk",
  sk: "test-sk",
  title: "Test Task",
  description: "Test Description",
  status: TaskStatus.OPEN,
  taskType: TaskType.SCHEDULED,
  startTimeInMillSec: Date.now(),
  expireTimeInMillSec: Date.now() + 86400000,
  ...overrides,
});

describe("TaskService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createTask", () => {
    it("should create a task successfully", async () => {
      const mockTask = createMockTask();
      const input: CreateTaskInput = {
        pk: "test-pk",
        sk: "test-sk",
        title: "Test Task",
        description: "Test Description",
        taskType: TaskType.SCHEDULED,
        status: TaskStatus.OPEN,
      };

      (DataStore.save as jest.Mock).mockResolvedValue(mockTask);

      const result = await TaskService.createTask(input);

      expect(DataStore.save).toHaveBeenCalledWith(expect.any(DataStoreTask));
      expect(result).toEqual(mockTask);
    });

    it("should throw error on create failure", async () => {
      const input: CreateTaskInput = {
        pk: "test-pk",
        sk: "test-sk",
        title: "Test Task",
        taskType: TaskType.SCHEDULED,
        status: TaskStatus.OPEN,
      };

      const error = new Error("Create failed");
      (DataStore.save as jest.Mock).mockRejectedValue(error);

      await expect(TaskService.createTask(input)).rejects.toThrow(
        "Create failed"
      );
    });
  });

  describe("getTasks", () => {
    it("should return all tasks when no filters provided", async () => {
      const mockTasks = [
        createMockTask({ id: "1" }),
        createMockTask({ id: "2" }),
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockTasks);

      const result = await TaskService.getTasks();

      expect(DataStore.query).toHaveBeenCalledWith(DataStoreTask);
      expect(result).toEqual(mockTasks);
    });

    it("should filter tasks by status", async () => {
      const mockTasks = [
        createMockTask({ id: "1", status: TaskStatus.OPEN }),
        createMockTask({ id: "2", status: TaskStatus.COMPLETED }),
        createMockTask({ id: "3", status: TaskStatus.OPEN }),
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockTasks);

      const result = await TaskService.getTasks({ status: [TaskStatus.OPEN] });

      expect(result).toHaveLength(2);
      expect(result.every(t => t.status === TaskStatus.OPEN)).toBe(true);
    });

    it("should filter tasks by taskType", async () => {
      const mockTasks = [
        createMockTask({ id: "1", taskType: TaskType.SCHEDULED }),
        createMockTask({ id: "2", taskType: TaskType.TIMED }),
        createMockTask({ id: "3", taskType: TaskType.SCHEDULED }),
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockTasks);

      const result = await TaskService.getTasks({
        taskType: [TaskType.SCHEDULED],
      });

      expect(result).toHaveLength(2);
      expect(result.every(t => t.taskType === TaskType.SCHEDULED)).toBe(true);
    });

    it("should filter tasks by searchText", async () => {
      const mockTasks = [
        createMockTask({ id: "1", title: "Task One" }),
        createMockTask({ id: "2", title: "Task Two" }),
        createMockTask({ id: "3", title: "Another Task" }),
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockTasks);

      const result = await TaskService.getTasks({ searchText: "One" });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Task One");
    });

    it("should filter tasks by date range", async () => {
      const now = Date.now();
      const mockTasks = [
        createMockTask({ id: "1", startTimeInMillSec: now - 86400000 }), // Yesterday
        createMockTask({ id: "2", startTimeInMillSec: now }), // Today
        createMockTask({ id: "3", startTimeInMillSec: now + 86400000 }), // Tomorrow
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockTasks);

      const dateFrom = new Date(now - 43200000); // 12 hours ago
      const dateTo = new Date(now + 43200000); // 12 hours from now

      const result = await TaskService.getTasks({ dateFrom, dateTo });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });

  describe("getTaskById", () => {
    it("should return a task by id", async () => {
      const testId = "550e8400-e29b-41d4-a716-446655440001";
      const mockTask = createMockTask({ id: testId });
      (DataStore.query as jest.Mock).mockResolvedValue(mockTask);

      const result = await TaskService.getTaskById(testId);

      expect(DataStore.query).toHaveBeenCalledWith(DataStoreTask, testId);
      expect(result).toEqual(mockTask);
    });

    it("should return null if task not found", async () => {
      const nonExistentId = "550e8400-e29b-41d4-a716-446655440002";
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      const result = await TaskService.getTaskById(nonExistentId);

      expect(result).toBeNull();
    });
  });

  describe("updateTask", () => {
    it("should update a task successfully", async () => {
      const testId = "550e8400-e29b-41d4-a716-446655440003";
      const originalTask = createMockTask({ id: testId, title: "Original" });
      const updatedTask = createMockTask({ id: testId, title: "Updated" });

      (DataStore.query as jest.Mock).mockResolvedValue(originalTask);
      (DataStore.save as jest.Mock).mockResolvedValue(updatedTask);

      const result = await TaskService.updateTask(testId, {
        title: "Updated",
      });

      expect(DataStore.query).toHaveBeenCalledWith(DataStoreTask, testId);
      expect(DataStore.save).toHaveBeenCalled();
      expect(result.title).toBe("Updated");
    });

    it("should throw error if task not found", async () => {
      const nonExistentId = "550e8400-e29b-41d4-a716-446655440004";
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      await expect(
        TaskService.updateTask(nonExistentId, { title: "Updated" })
      ).rejects.toThrow(`Task with id ${nonExistentId} not found`);
    });
  });

  describe("deleteTask", () => {
    it("should delete a task successfully", async () => {
      const testId = "550e8400-e29b-41d4-a716-446655440005";
      const mockTask = createMockTask({ id: testId });
      (DataStore.query as jest.Mock).mockResolvedValue(mockTask);
      (DataStore.delete as jest.Mock).mockResolvedValue(mockTask);

      await TaskService.deleteTask(testId);

      expect(DataStore.query).toHaveBeenCalledWith(DataStoreTask, testId);
      expect(DataStore.delete).toHaveBeenCalledWith(mockTask);
    });

    it("should not throw if task not found (idempotent delete)", async () => {
      const nonExistentId = "550e8400-e29b-41d4-a716-446655440006";
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      await expect(
        TaskService.deleteTask(nonExistentId)
      ).resolves.toBeUndefined();
      expect(DataStore.delete).not.toHaveBeenCalled();
    });
  });

  describe("subscribeTasks", () => {
    it("should subscribe to task changes", () => {
      const mockTasks = [
        createMockTask({ id: "550e8400-e29b-41d4-a716-446655440007" }),
      ];
      const mockSubscription = {
        subscribe: jest.fn(callback => {
          callback({ items: mockTasks, isSynced: true });
          return { unsubscribe: jest.fn() };
        }),
      };

      (DataStore.observeQuery as jest.Mock).mockReturnValue(mockSubscription);
      (DataStore.observe as jest.Mock).mockReturnValue({
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      });

      const callback = jest.fn();
      const result = TaskService.subscribeTasks(callback);

      expect(DataStore.observeQuery).toHaveBeenCalledWith(DataStoreTask);
      expect(callback).toHaveBeenCalledWith(mockTasks, true);
      expect(result).toHaveProperty("unsubscribe");
    });
  });

  describe("deleteAllTasks", () => {
    it("should delete all tasks", async () => {
      const mockTasks = [
        createMockTask({ id: "1" }),
        createMockTask({ id: "2" }),
        createMockTask({ id: "3" }),
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockTasks);
      (DataStore.delete as jest.Mock).mockResolvedValue(undefined);

      await TaskService.deleteAllTasks();

      expect(DataStore.query).toHaveBeenCalledWith(DataStoreTask);
      expect(DataStore.delete).toHaveBeenCalledTimes(3);
    });
  });
});
