import { extractActivityIdFromTask } from "@utils/tasks/taskUtils";
import { Task } from "@task-types/Task";

describe("extractActivityIdFromTask", () => {
  describe("Happy path - entityId", () => {
    it("should extract activity ID from entityId with Activity. prefix", () => {
      const task: Task = {
        entityId: "Activity.12345",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should extract activity ID from entityId without Activity. prefix", () => {
      const task: Task = {
        entityId: "12345",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should extract activity ID from entityId with version suffix", () => {
      const task: Task = {
        entityId: "Activity.12345#v1",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should extract activity ID from entityId with Activity. prefix and version suffix", () => {
      const task: Task = {
        entityId: "Activity.12345#v2.0",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should extract activity ID from ActivityRef chain", () => {
      const task: Task = {
        entityId:
          "ActivityRef#Arm.111#ActivityGroup.222#Activity.ad93b50d-7d49-4128-8a59-91275e77f3c8",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("ad93b50d-7d49-4128-8a59-91275e77f3c8");
    });
  });

  describe("Edge cases - entityId", () => {
    it("should return null when entityId is null", () => {
      const task: Task = {
        entityId: null,
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when entityId is undefined", () => {
      const task: Task = {
        entityId: undefined,
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when entityId is empty string", () => {
      const task: Task = {
        entityId: "",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when entityId is whitespace only", () => {
      const task: Task = {
        entityId: "   ",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should handle entityId that is not a string (number)", () => {
      const task: Task = {
        entityId: 12345 as unknown as string,
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should handle entityId that is not a string (object)", () => {
      const task: Task = {
        entityId: { id: "12345" } as unknown as string,
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should handle entityId with only Activity. prefix and no ID", () => {
      const task: Task = {
        entityId: "Activity.",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should handle entityId with multiple # separators", () => {
      const task: Task = {
        entityId: "Activity.12345#v1#extra",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should return null for bare ActivityRef token", () => {
      const task: Task = {
        entityId: "ActivityRef",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });
  });

  describe("Happy path - actions JSON", () => {
    it("should extract activity ID from actions JSON with entityId", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: "Activity.12345" }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should extract activity ID from actions JSON without Activity. prefix", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: "12345" }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should extract activity ID from actions JSON with version suffix", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: "Activity.12345#v1" }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should extract activity ID from first action when multiple actions exist", () => {
      const task: Task = {
        actions: JSON.stringify([
          { entityId: "Activity.12345" },
          { entityId: "Activity.67890" },
        ]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });

    it("should extract activity ID from actions JSON with ActivityRef chain", () => {
      const task: Task = {
        actions: JSON.stringify([
          {
            entityId:
              "ActivityRef#Arm.111#ActivityGroup.222#Activity.ad93b50d-7d49-4128-8a59-91275e77f3c8",
          },
        ]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("ad93b50d-7d49-4128-8a59-91275e77f3c8");
    });
  });

  describe("Edge cases - actions JSON", () => {
    it("should return null when actions is null", () => {
      const task: Task = {
        actions: null,
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when actions is undefined", () => {
      const task: Task = {
        actions: undefined,
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when actions is empty string", () => {
      const task: Task = {
        actions: "",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when actions is invalid JSON", () => {
      const task: Task = {
        actions: "not valid json",
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when actions is empty array", () => {
      const task: Task = {
        actions: JSON.stringify([]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when first action has no entityId", () => {
      const task: Task = {
        actions: JSON.stringify([{ otherField: "value" }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when first action entityId is null", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: null }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when first action entityId is undefined", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: undefined }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when first action entityId is empty string", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: "" }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when first action entityId is whitespace only", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: "   " }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should handle first action entityId that is not a string (number)", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: 12345 }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should handle first action entityId that is not a string (object)", () => {
      const task: Task = {
        actions: JSON.stringify([{ entityId: { id: "12345" } }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });
  });

  describe("Priority - entityId takes precedence", () => {
    it("should use entityId even when actions also has entityId", () => {
      const task: Task = {
        entityId: "Activity.12345",
        actions: JSON.stringify([{ entityId: "Activity.67890" }]),
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBe("12345");
    });
  });

  describe("No activity ID found", () => {
    it("should return null when task has neither entityId nor actions", () => {
      const task: Task = {} as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });

    it("should return null when both entityId and actions are invalid", () => {
      const task: Task = {
        entityId: null,
        actions: null,
      } as Task;

      const result = extractActivityIdFromTask(task);
      expect(result).toBeNull();
    });
  });
});
