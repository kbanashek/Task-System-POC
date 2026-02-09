import { DataStore, OpType } from "@aws-amplify/datastore";
import { ConflictResolution } from "@services/ConflictResolution";

jest.mock("@aws-amplify/datastore");

describe("ConflictResolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ConflictResolution as any).resetForTesting();
  });

  describe("configure", () => {
    it("should configure DataStore with conflict handler", () => {
      ConflictResolution.configure();

      expect(DataStore.configure).toHaveBeenCalledWith({
        conflictHandler: expect.any(Function),
      });
    });

    it("should handle Task UPDATE conflicts by preferring local status", async () => {
      ConflictResolution.configure();

      const configureCall = (DataStore.configure as jest.Mock).mock.calls[0][0];
      const conflictHandler = configureCall.conflictHandler;

      const localModel = {
        status: "COMPLETED",
        startTimeInMillSec: 1000,
        activityAnswer: "local answer",
      };
      const remoteModel = {
        status: "OPEN",
        startTimeInMillSec: 2000,
        activityAnswer: null,
      };

      const result = await conflictHandler({
        modelConstructor: { name: "Task" },
        localModel,
        remoteModel,
        operation: OpType.UPDATE,
        attempts: 1,
      });

      expect(result.status).toBe("COMPLETED"); // Prefer local status
      expect(result.startTimeInMillSec).toBe(2000); // Prefer remote timing
      expect(result.activityAnswer).toBe("local answer"); // Prefer local answer
    });

    it("should handle DELETE conflicts for Task model", async () => {
      ConflictResolution.configure();

      const configureCall = (DataStore.configure as jest.Mock).mock.calls[0][0];
      const conflictHandler = configureCall.conflictHandler;

      // Remote already deleted
      const result1 = await conflictHandler({
        modelConstructor: { name: "Task" },
        localModel: { _deleted: true as const },
        remoteModel: { _deleted: true as const, title: "Task" },
        operation: OpType.DELETE,
        attempts: 1,
      });

      expect(result1).toEqual({ _deleted: true as const, title: "Task" });

      // Local incomplete, use remote with _deleted
      const result2 = await conflictHandler({
        modelConstructor: { name: "Task" },
        localModel: {}, // Incomplete
        remoteModel: { title: "Task", description: "Desc" },
        operation: OpType.DELETE,
        attempts: 1,
      });

      expect(result2._deleted).toBe(true);
    });

    it("should handle DELETE conflicts for other models", async () => {
      ConflictResolution.configure();

      const configureCall = (DataStore.configure as jest.Mock).mock.calls[0][0];
      const conflictHandler = configureCall.conflictHandler;

      // DataPoint with incomplete local model
      const result1 = await conflictHandler({
        modelConstructor: { name: "DataPoint" },
        localModel: {}, // No pk/sk
        remoteModel: { pk: "PK", sk: "SK", name: "DataPoint" },
        operation: OpType.DELETE,
        attempts: 1,
      });

      expect(result1._deleted).toBe(true);

      // DataPoint with complete local model
      const result2 = await conflictHandler({
        modelConstructor: { name: "DataPoint" },
        localModel: { pk: "PK", sk: "SK", _deleted: true as const },
        remoteModel: { pk: "PK", sk: "SK", name: "DataPoint" },
        operation: OpType.DELETE,
        attempts: 1,
      });

      expect(result2).toEqual({ pk: "PK", sk: "SK", _deleted: true as const });
    });

    it("should default to remote model for UPDATE and CREATE operations", async () => {
      ConflictResolution.configure();

      const configureCall = (DataStore.configure as jest.Mock).mock.calls[0][0];
      const conflictHandler = configureCall.conflictHandler;

      const remoteModel = { id: "1", name: "Remote" };
      const localModel = { id: "1", name: "Local" };

      // UPDATE for non-Task model
      const result1 = await conflictHandler({
        modelConstructor: { name: "Activity" },
        localModel,
        remoteModel,
        operation: OpType.UPDATE,
        attempts: 1,
      });

      expect(result1).toEqual(remoteModel);

      // CREATE operation
      const result2 = await conflictHandler({
        modelConstructor: { name: "Question" },
        localModel,
        remoteModel,
        operation: OpType.INSERT,
        attempts: 1,
      });

      expect(result2).toEqual(remoteModel);
    });

    it("should handle Question model DELETE conflicts", async () => {
      ConflictResolution.configure();

      const configureCall = (DataStore.configure as jest.Mock).mock.calls[0][0];
      const conflictHandler = configureCall.conflictHandler;

      // Incomplete local Question
      const result = await conflictHandler({
        modelConstructor: { name: "Question" },
        localModel: {}, // No question/questionId
        remoteModel: { question: "What is this?" },
        operation: OpType.DELETE,
        attempts: 1,
      });

      expect(result._deleted).toBe(true);
    });

    it("should handle Activity model DELETE conflicts", async () => {
      ConflictResolution.configure();

      const configureCall = (DataStore.configure as jest.Mock).mock.calls[0][0];
      const conflictHandler = configureCall.conflictHandler;

      // Incomplete local Activity
      const result = await conflictHandler({
        modelConstructor: { name: "Activity" },
        localModel: {}, // No name/title
        remoteModel: { name: "Activity Name" },
        operation: OpType.DELETE,
        attempts: 1,
      });

      expect(result._deleted).toBe(true);
    });

    it("should preserve non-enumerable pk/sk/id on conflict handler results", async () => {
      ConflictResolution.configure();

      const configureCall = (DataStore.configure as jest.Mock).mock.calls[0][0];
      const conflictHandler = configureCall.conflictHandler;

      // Simulate Amplify providing a model instance with non-enumerable keys
      const remoteModel: Record<string, unknown> = {
        name: "Remote",
        _deleted: true as const,
      };
      Object.defineProperty(remoteModel, "pk", {
        value: "PK",
        enumerable: false,
      });
      Object.defineProperty(remoteModel, "sk", {
        value: "SK",
        enumerable: false,
      });
      Object.defineProperty(remoteModel, "id", {
        value: "ID",
        enumerable: false,
      });

      const result = await conflictHandler({
        modelConstructor: { name: "Task" },
        localModel: {}, // incomplete local
        remoteModel,
        operation: OpType.DELETE,
        attempts: 1,
      });

      expect(result.pk).toBe("PK");
      expect(result.sk).toBe("SK");
      expect(result.id).toBe("ID");
      expect(result._deleted).toBe(true);
    });
  });
});
