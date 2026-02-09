import { DataStore } from "@aws-amplify/datastore";
import { TaskAnswer } from "@models/index";
import { TaskAnswerService } from "@services/TaskAnswerService";
import { CreateTaskAnswerInput } from "@task-types/TaskAnswer";

jest.mock("@aws-amplify/datastore");

const createMockTaskAnswer = (
  overrides: Partial<TaskAnswer> = {}
): TaskAnswer =>
  ({
    id: "test-answer-id",
    pk: "test-pk",
    sk: "test-sk",
    taskInstanceId: "test-task-id",
    questionId: "test-question-id",
    answer: "Test Answer",
    ...overrides,
  }) as TaskAnswer;

describe("TaskAnswerService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createTaskAnswer", () => {
    it("should create a task answer successfully", async () => {
      const mockAnswer = createMockTaskAnswer();
      const input: CreateTaskAnswerInput = {
        pk: "test-pk",
        sk: "test-sk",
        taskInstanceId: "test-task-id",
        questionId: "test-question-id",
        answer: "Test Answer",
      };

      (DataStore.save as jest.Mock).mockResolvedValue(mockAnswer);

      const result = await TaskAnswerService.createTaskAnswer(input);

      expect(DataStore.save).toHaveBeenCalledWith(expect.any(TaskAnswer));
      expect(result).toEqual(mockAnswer);
    });

    it("should throw error on create failure", async () => {
      const input: CreateTaskAnswerInput = {
        pk: "test-pk",
        sk: "test-sk",
        taskInstanceId: "test-task-id",
        questionId: "test-question-id",
        answer: "Test Answer",
      };

      const error = new Error("Create failed");
      (DataStore.save as jest.Mock).mockRejectedValue(error);

      await expect(TaskAnswerService.createTaskAnswer(input)).rejects.toThrow(
        "Create failed"
      );
    });
  });

  describe("getTaskAnswers", () => {
    it("should return all task answers", async () => {
      const mockAnswers = [
        createMockTaskAnswer({ id: "1" }),
        createMockTaskAnswer({ id: "2" }),
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockAnswers);

      const result = await TaskAnswerService.getTaskAnswers();

      expect(DataStore.query).toHaveBeenCalledWith(TaskAnswer);
      expect(result).toEqual(mockAnswers);
    });
  });

  describe("getTaskAnswer", () => {
    it("should return a task answer by id", async () => {
      const mockAnswer = createMockTaskAnswer({ id: "test-id" });
      (DataStore.query as jest.Mock).mockResolvedValue(mockAnswer);

      const result = await TaskAnswerService.getTaskAnswer("test-id");

      expect(DataStore.query).toHaveBeenCalledWith(TaskAnswer, "test-id");
      expect(result).toEqual(mockAnswer);
    });

    it("should return null if task answer not found", async () => {
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      const result = await TaskAnswerService.getTaskAnswer("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateTaskAnswer", () => {
    it("should update a task answer successfully", async () => {
      const originalAnswer = createMockTaskAnswer({
        id: "test-id",
        answer: "Original Answer",
      });
      const updatedAnswer = createMockTaskAnswer({
        id: "test-id",
        answer: "Updated Answer",
      });

      (DataStore.query as jest.Mock).mockResolvedValue(originalAnswer);
      (DataStore.save as jest.Mock).mockResolvedValue(updatedAnswer);

      const result = await TaskAnswerService.updateTaskAnswer("test-id", {
        answer: "Updated Answer",
      });

      expect(DataStore.query).toHaveBeenCalledWith(TaskAnswer, "test-id");
      expect(DataStore.save).toHaveBeenCalled();
      expect(result.answer).toBe("Updated Answer");
    });

    it("should throw error if task answer not found", async () => {
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      await expect(
        TaskAnswerService.updateTaskAnswer("non-existent", {
          answer: "Updated Answer",
        })
      ).rejects.toThrow("TaskAnswer with id non-existent not found");
    });
  });

  describe("deleteTaskAnswer", () => {
    it("should delete a task answer successfully", async () => {
      const mockAnswer = createMockTaskAnswer({ id: "test-id" });
      (DataStore.query as jest.Mock).mockResolvedValue(mockAnswer);
      (DataStore.delete as jest.Mock).mockResolvedValue(mockAnswer);

      await TaskAnswerService.deleteTaskAnswer("test-id");

      expect(DataStore.query).toHaveBeenCalledWith(TaskAnswer, "test-id");
      expect(DataStore.delete).toHaveBeenCalledWith(mockAnswer);
    });

    it("should throw error if task answer not found", async () => {
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      await expect(
        TaskAnswerService.deleteTaskAnswer("non-existent")
      ).rejects.toThrow("TaskAnswer with id non-existent not found");
    });
  });

  describe("subscribeTaskAnswers", () => {
    it("should subscribe to task answer changes", () => {
      const mockAnswers = [createMockTaskAnswer({ id: "1" })];
      const mockSubscription = {
        subscribe: jest.fn((observer: any) => {
          if (observer && typeof observer.next === "function") {
            observer.next({ items: mockAnswers, isSynced: true });
          } else if (typeof observer === "function") {
            observer({ items: mockAnswers, isSynced: true });
          }
          return { unsubscribe: jest.fn() };
        }),
      };

      (DataStore.observeQuery as jest.Mock).mockReturnValue(mockSubscription);
      (DataStore.observe as jest.Mock).mockReturnValue({
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      });

      const callback = jest.fn();
      const result = TaskAnswerService.subscribeTaskAnswers(callback);

      expect(DataStore.observeQuery).toHaveBeenCalledWith(TaskAnswer);
      expect(callback).toHaveBeenCalledWith(mockAnswers, true);
      expect(result).toHaveProperty("unsubscribe");
    });

    it("filters out _deleted tombstones from subscription items", () => {
      const mockAnswers = [
        createMockTaskAnswer({ id: "1" }),
        { ...createMockTaskAnswer({ id: "2" }), _deleted: true as const },
      ];
      const mockSubscription = {
        subscribe: jest.fn((observer: any) => {
          if (observer && typeof observer.next === "function") {
            observer.next({ items: mockAnswers, isSynced: true });
          } else if (typeof observer === "function") {
            observer({ items: mockAnswers, isSynced: true });
          }
          return { unsubscribe: jest.fn() };
        }),
      };

      (DataStore.observeQuery as jest.Mock).mockReturnValue(mockSubscription);
      (DataStore.observe as jest.Mock).mockReturnValue({
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      });

      const callback = jest.fn();
      TaskAnswerService.subscribeTaskAnswers(callback);

      expect(callback).toHaveBeenCalledWith([mockAnswers[0]], true);
    });
  });

  describe("deleteAllTaskAnswers", () => {
    it("should delete all task answers successfully", async () => {
      const mockAnswers = [
        createMockTaskAnswer({ id: "1" }),
        createMockTaskAnswer({ id: "2" }),
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockAnswers);
      (DataStore.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await TaskAnswerService.deleteAllTaskAnswers();

      expect(DataStore.query).toHaveBeenCalledWith(TaskAnswer);
      expect(DataStore.delete).toHaveBeenCalledTimes(2);
      expect(result).toBe(2);
    });

    it("should return 0 if no task answers exist", async () => {
      (DataStore.query as jest.Mock).mockResolvedValue([]);

      const result = await TaskAnswerService.deleteAllTaskAnswers();

      expect(result).toBe(0);
    });
  });

  describe("clearDataStore", () => {
    it("should clear DataStore successfully", async () => {
      (DataStore.clear as jest.Mock).mockResolvedValue(undefined);

      await TaskAnswerService.clearDataStore();

      expect(DataStore.clear).toHaveBeenCalled();
    });
  });
});
