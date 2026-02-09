import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useActivity } from "@hooks/useActivity";
import { createSubscriptionHolder } from "@test-utils/testUtils";

// Mock ActivityService
jest.mock("@services/ActivityService", () => ({
  ActivityService: {
    getActivities: jest.fn(),
    subscribeActivities: jest.fn(),
  },
}));

import { ActivityService } from "@services/ActivityService";
import { Activity as ActivityModel } from "@models/index";
import { Activity } from "@task-types/Activity";

describe("useActivity", () => {
  const mockGetActivities =
    ActivityService.getActivities as jest.MockedFunction<
      typeof ActivityService.getActivities
    >;
  const mockSubscribeActivities =
    ActivityService.subscribeActivities as jest.MockedFunction<
      typeof ActivityService.subscribeActivities
    >;

  const mockActivity: Activity = {
    id: "1",
    pk: "ACTIVITY-1",
    sk: "SK-1",
    name: "Test Activity",
    title: "Test Title",
    description: "Test Description",
    type: "QUESTIONNAIRE",
  };

  const mockActivities = [mockActivity] as ActivityModel[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("null activityId", () => {
    it("returns null activity when activityId is null", async () => {
      const { result } = renderHook(() => useActivity(null));
      await waitFor(() => {
        expect(result.current.activity).toBeNull();
        expect(result.current.loading).toBe(false);
      });
      expect(mockGetActivities).not.toHaveBeenCalled();
    });
  });

  describe("fetching activity", () => {
    it("fetches activity by pk", async () => {
      mockGetActivities.mockResolvedValue(mockActivities);
      mockSubscribeActivities.mockReturnValue({
        unsubscribe: jest.fn(),
      });
      const { result } = renderHook(() => useActivity("ACTIVITY-1"));

      await waitFor(() => {
        expect(result.current.activity).toEqual(mockActivity);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
      expect(mockGetActivities).toHaveBeenCalled();
    });

    it("prefers hydrated ActivityRef record with layouts when multiple match by sk", async () => {
      const uuid = "ad93b50d-7d49-4128-8a59-91275e77f3c8";

      const stub = {
        id: "stub",
        pk: `Activity.${uuid}`,
        sk: `SK-Activity.${uuid}`,
        layouts: null,
        activityGroups: null,
        name: "Stub Activity",
      } as ActivityModel;

      const hydrated = {
        id: "hydrated",
        pk: `Activity.${uuid}`,
        sk: `ActivityRef#Activity.${uuid}`,
        layouts: JSON.stringify({ layouts: [{ type: "MOBILE", screens: [] }] }),
        activityGroups: JSON.stringify([]),
        name: "Hydrated Activity",
      } as ActivityModel;

      mockGetActivities.mockResolvedValue([stub, hydrated]);
      mockSubscribeActivities.mockReturnValue({
        unsubscribe: jest.fn(),
      });

      const { result } = renderHook(() => useActivity(uuid));

      await waitFor(() => {
        expect(result.current.activity?.id).toBe("hydrated");
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it("fetches activity by id", async () => {
      mockGetActivities.mockResolvedValue(mockActivities);
      mockSubscribeActivities.mockReturnValue({
        unsubscribe: jest.fn(),
      });
      const { result } = renderHook(() => useActivity("1"));

      await waitFor(() => {
        expect(result.current.activity).toEqual(mockActivity);
        expect(result.current.loading).toBe(false);
      });
    });

    it("handles activity not found", async () => {
      mockGetActivities.mockResolvedValue([]);
      mockSubscribeActivities.mockReturnValue({
        unsubscribe: jest.fn(),
      });
      const { result } = renderHook(() => useActivity("NONEXISTENT"));

      await waitFor(() => {
        expect(result.current.activity).toBeNull();
        expect(result.current.error).toBe("Activity not found: NONEXISTENT");
        expect(result.current.loading).toBe(false);
      });
    });

    it("handles fetch errors", async () => {
      mockGetActivities.mockRejectedValue(new Error("Fetch failed"));
      mockSubscribeActivities.mockReturnValue({
        unsubscribe: jest.fn(),
      });
      const { result } = renderHook(() => useActivity("ACTIVITY-1"));

      await waitFor(() => {
        expect(result.current.activity).toBeNull();
        expect(result.current.error).toBe("Fetch failed");
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("subscription updates", () => {
    it("updates activity when subscription fires", async () => {
      const { holder, setCallback } = createSubscriptionHolder<ActivityModel>();
      mockGetActivities.mockResolvedValue(mockActivities);
      mockSubscribeActivities.mockImplementation(callback => {
        setCallback(callback);
        return { unsubscribe: jest.fn() };
      });
      const { result } = renderHook(() => useActivity("ACTIVITY-1"));

      await waitFor(() => {
        expect(result.current.activity).toEqual(mockActivity);
      });

      const updatedActivity = {
        ...mockActivity,
        title: "Updated Title",
      } as ActivityModel;

      holder.callback?.([updatedActivity], true);

      await waitFor(() => {
        expect(result.current.activity?.title).toBe("Updated Title");
      });
    });

    it("does not update when subscription fires with different activityId", async () => {
      const { holder, setCallback } = createSubscriptionHolder<ActivityModel>();
      mockGetActivities.mockResolvedValue(mockActivities);
      mockSubscribeActivities.mockImplementation(callback => {
        setCallback(callback);
        return { unsubscribe: jest.fn() };
      });
      const { result } = renderHook(() => useActivity("ACTIVITY-1"));

      await waitFor(() => {
        expect(result.current.activity).toEqual(mockActivity);
      });

      const otherActivity = {
        id: "2",
        pk: "ACTIVITY-2",
        sk: "SK-2",
        name: "Other Activity",
        title: "Other Title",
        description: "Other Description",
        type: "QUESTIONNAIRE",
      } as ActivityModel;

      holder.callback?.([otherActivity], true);

      await waitFor(() => {
        expect(result.current.activity).toEqual(mockActivity);
      });
    });
  });

  describe("refresh", () => {
    it("refreshes activity", async () => {
      mockGetActivities.mockResolvedValue(mockActivities);
      mockSubscribeActivities.mockReturnValue({
        unsubscribe: jest.fn(),
      });
      const { result } = renderHook(() => useActivity("ACTIVITY-1"));

      await waitFor(() => {
        expect(result.current.activity).toEqual(mockActivity);
      });

      const updatedActivity = {
        ...mockActivity,
        title: "Refreshed Title",
      } as ActivityModel;
      mockGetActivities.mockResolvedValue([updatedActivity]);

      await act(async () => {
        await result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.activity?.title).toBe("Refreshed Title");
      });
    });
  });

  describe("cleanup", () => {
    it("unsubscribes on unmount", () => {
      const unsubscribe = jest.fn();
      mockGetActivities.mockResolvedValue(mockActivities);
      mockSubscribeActivities.mockReturnValue({
        unsubscribe,
      });
      const { unmount } = renderHook(() => useActivity("ACTIVITY-1"));
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
