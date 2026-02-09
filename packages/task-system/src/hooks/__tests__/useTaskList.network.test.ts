import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useTaskList } from "@hooks/useTaskList";

// Mock TaskService
jest.mock("@services/TaskService", () => ({
  TaskService: {
    subscribeTasks: jest.fn(),
    getTasks: jest.fn(),
    deleteTask: jest.fn(),
    clearDataStore: jest.fn(),
  },
}));

// Mock AmplifyContext
jest.mock("@contexts/AmplifyContext", () => ({
  useAmplify: jest.fn(),
}));

import { TaskService } from "@services/TaskService";
import { useAmplify } from "@contexts/AmplifyContext";
import { NetworkStatus } from "@hooks/useAmplifyState";

describe("useTaskList - Network & Cleanup", () => {
  const mockSubscribeTasks = TaskService.subscribeTasks as jest.MockedFunction<
    typeof TaskService.subscribeTasks
  >;
  const mockUseAmplify = useAmplify as jest.MockedFunction<typeof useAmplify>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock values
    mockUseAmplify.mockReturnValue({
      networkStatus: NetworkStatus.Online,
      syncState: "SYNCED" as any,
      isReady: true,
      conflictCount: 0,
    } as any);
  });

  it("returns online status when network is online", () => {
    mockSubscribeTasks.mockReturnValue({
      unsubscribe: jest.fn(),
    });
    const { result } = renderHook(() => useTaskList());
    expect(result.current.isOnline).toBe(true);
  });

  it("returns offline status when network is offline", () => {
    mockUseAmplify.mockReturnValue({
      networkStatus: NetworkStatus.Offline,
      syncState: "NOT_SYNCED" as any,
      isReady: false,
      conflictCount: 0,
    } as any);
    mockSubscribeTasks.mockReturnValue({
      unsubscribe: jest.fn(),
    });
    const { result } = renderHook(() => useTaskList());
    expect(result.current.isOnline).toBe(false);
  });

  it("unsubscribes on unmount", async () => {
    const unsubscribe = jest.fn();
    let subscriptionCallback: ((items: any[], synced: boolean) => void) | null =
      null;

    mockSubscribeTasks.mockImplementation(callback => {
      subscriptionCallback = callback;
      return { unsubscribe };
    });

    const { unmount, result } = renderHook(() => useTaskList());
    expect(mockSubscribeTasks).toHaveBeenCalled();

    // Trigger the subscription callback to ensure subscription is set in state
    await act(async () => {
      if (subscriptionCallback) {
        subscriptionCallback([], true);
      }
    });

    // Wait for the hook to process the subscription
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Give React time to update state
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
