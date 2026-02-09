import { DataStore } from "@aws-amplify/datastore";
import { Activity } from "@models/index";
import { ActivityService } from "@services/ActivityService";

jest.mock("@aws-amplify/datastore");

const createMockActivity = (overrides: Partial<Activity> = {}): Activity =>
  ({
    id: "test-activity-id",
    pk: "test-pk",
    sk: "test-sk",
    name: "Test Activity",
    layouts: JSON.stringify({ activityGroups: [] }),
    ...overrides,
  }) as Activity;

describe("ActivityService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createActivity", () => {
    it("should create an activity successfully", async () => {
      const mockActivity = createMockActivity();
      const input = {
        pk: "test-pk",
        sk: "test-sk",
        name: "Test Activity",
        layouts: JSON.stringify({ activityGroups: [] }),
      };

      (DataStore.save as jest.Mock).mockResolvedValue(mockActivity);

      const result = await ActivityService.createActivity(input);

      expect(DataStore.save).toHaveBeenCalledWith(expect.any(Activity));
      expect(result).toEqual(mockActivity);
    });

    it("should throw error on create failure", async () => {
      const input = {
        pk: "test-pk",
        sk: "test-sk",
        name: "Test Activity",
        layouts: JSON.stringify({}),
      };

      const error = new Error("Create failed");
      (DataStore.save as jest.Mock).mockRejectedValue(error);

      await expect(ActivityService.createActivity(input)).rejects.toThrow(
        "Create failed"
      );
    });
  });

  describe("getActivities", () => {
    it("should return all activities", async () => {
      const mockActivities = [
        createMockActivity({ id: "1" }),
        createMockActivity({ id: "2" }),
      ];
      (DataStore.query as jest.Mock).mockResolvedValue(mockActivities);

      const result = await ActivityService.getActivities();

      expect(DataStore.query).toHaveBeenCalledWith(Activity);
      expect(result).toEqual(mockActivities);
    });
  });

  describe("getActivity", () => {
    it("should return an activity by id", async () => {
      const mockActivity = createMockActivity({ id: "test-id" });
      (DataStore.query as jest.Mock).mockResolvedValue(mockActivity);

      const result = await ActivityService.getActivity("test-id");

      expect(DataStore.query).toHaveBeenCalledWith(Activity, "test-id");
      expect(result).toEqual(mockActivity);
    });

    it("should return null if activity not found", async () => {
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      const result = await ActivityService.getActivity("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateActivity", () => {
    it("should update an activity successfully", async () => {
      const originalActivity = createMockActivity({
        id: "test-id",
        name: "Original",
      });
      const updatedActivity = createMockActivity({
        id: "test-id",
        name: "Updated",
      });

      (DataStore.query as jest.Mock).mockResolvedValue(originalActivity);
      (DataStore.save as jest.Mock).mockResolvedValue(updatedActivity);

      const result = await ActivityService.updateActivity("test-id", {
        name: "Updated",
      });

      expect(DataStore.query).toHaveBeenCalledWith(Activity, "test-id");
      expect(DataStore.save).toHaveBeenCalled();
      expect(result.name).toBe("Updated");
    });

    it("should throw error if activity not found", async () => {
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      await expect(
        ActivityService.updateActivity("non-existent", { name: "Updated" })
      ).rejects.toThrow("Activity with id non-existent not found");
    });
  });

  describe("deleteActivity", () => {
    it("should delete an activity successfully", async () => {
      const mockActivity = createMockActivity({ id: "test-id" });
      (DataStore.query as jest.Mock).mockResolvedValue(mockActivity);
      (DataStore.delete as jest.Mock).mockResolvedValue(mockActivity);

      await ActivityService.deleteActivity("test-id");

      expect(DataStore.query).toHaveBeenCalledWith(Activity, "test-id");
      expect(DataStore.delete).toHaveBeenCalledWith(mockActivity);
    });

    it("should not throw if activity not found (idempotent delete)", async () => {
      (DataStore.query as jest.Mock).mockResolvedValue(null);

      await expect(
        ActivityService.deleteActivity("non-existent")
      ).resolves.toBeUndefined();
      expect(DataStore.delete).not.toHaveBeenCalled();
    });
  });

  describe("subscribeActivities", () => {
    it("should subscribe to activity changes", () => {
      const mockActivities = [createMockActivity({ id: "1" })];
      const mockSubscription = {
        subscribe: jest.fn(callback => {
          callback({ items: mockActivities, isSynced: true });
          return { unsubscribe: jest.fn() };
        }),
      };

      (DataStore.observeQuery as jest.Mock).mockReturnValue(mockSubscription);
      (DataStore.observe as jest.Mock).mockReturnValue({
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
      });

      const callback = jest.fn();
      const result = ActivityService.subscribeActivities(callback);

      expect(DataStore.observeQuery).toHaveBeenCalledWith(Activity);
      expect(callback).toHaveBeenCalledWith(mockActivities, true);
      expect(result).toHaveProperty("unsubscribe");
    });
  });
});
