import { renderHook, waitFor } from "@testing-library/react-native";
import {
  NetworkStatus,
  SyncState,
  useAmplifyState,
} from "@hooks/useAmplifyState";

import { Hub } from "@aws-amplify/core";
import { DataStore } from "@aws-amplify/datastore";
import NetInfo from "@react-native-community/netinfo";
import { ConflictResolution } from "@services/ConflictResolution";

// Mock aws-amplify Amplify singleton (LX uses Amplify.configure from aws-amplify)
// Mock AWS Amplify
jest.mock("@aws-amplify/core", () => ({
  Hub: {
    listen: jest.fn(),
  },
  Amplify: {
    isConfigured: true,
    getConfig: jest.fn(() => ({
      API: {
        GraphQL: {
          endpoint: "https://example.com/graphql",
          region: "us-east-1",
          defaultAuthMode: "userPool",
        },
      },
    })),
  },
}));

// Mock DataStore
jest.mock("@aws-amplify/datastore", () => ({
  DataStore: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

// Mock NetInfo
jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

// Mock ConflictResolution
jest.mock("@services/ConflictResolution", () => ({
  ConflictResolution: {
    configure: jest.fn(),
  },
}));

describe("useAmplifyState", () => {
  const mockHubListen = Hub.listen as jest.MockedFunction<typeof Hub.listen>;
  const mockDataStoreStart = DataStore.start as jest.MockedFunction<
    typeof DataStore.start
  >;
  const mockNetInfoFetch = NetInfo.fetch as jest.MockedFunction<
    typeof NetInfo.fetch
  >;
  const mockNetInfoAddEventListener =
    NetInfo.addEventListener as jest.MockedFunction<
      typeof NetInfo.addEventListener
    >;
  const mockConflictResolutionConfigure =
    ConflictResolution.configure as jest.MockedFunction<
      typeof ConflictResolution.configure
    >;

  let hubListener: ((hubData: any) => void) | null = null;
  let netInfoUnsubscribe: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    const { Amplify } = require("@aws-amplify/core") as {
      Amplify: { getConfig: jest.Mock };
    };
    Amplify.getConfig.mockReturnValue({
      API: {
        GraphQL: {
          endpoint: "https://example.com/graphql",
          region: "us-east-1",
          defaultAuthMode: "userPool",
        },
      },
    });
    mockDataStoreStart.mockResolvedValue(undefined);
    mockNetInfoFetch.mockResolvedValue({ isConnected: true } as any);
    mockNetInfoAddEventListener.mockReturnValue(() => {});
    mockHubListen.mockImplementation((channel, callback) => {
      hubListener = callback as any;
      return () => {};
    });
    mockConflictResolutionConfigure.mockReturnValue(undefined);
  });

  describe("initialization", () => {
    it("starts with initial state", () => {
      const { result } = renderHook(() => useAmplifyState());
      expect(result.current.isReady).toBe(false);
      expect(result.current.networkStatus).toBe(NetworkStatus.Online);
      expect(result.current.syncState).toBe(SyncState.NotSynced);
      expect(result.current.conflictCount).toBe(0);
    });

    it("initializes DataStore on mount", async () => {
      renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(mockDataStoreStart).toHaveBeenCalled();
      });
    });

    it("does not start DataStore when GraphQL endpoint is missing", async () => {
      const { Amplify } = require("@aws-amplify/core") as {
        Amplify: { getConfig: jest.Mock };
      };

      // useAmplifyState may consult Amplify config more than once during init;
      // make this sticky for the full test so we don't accidentally consume a single mockReturnValueOnce.
      Amplify.getConfig.mockReturnValue({
        API: { GraphQL: { endpoint: "" } },
      });

      const { result } = renderHook(() => useAmplifyState());

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(mockDataStoreStart).not.toHaveBeenCalled();
    });

    it("configures ConflictResolution on mount", async () => {
      renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(mockConflictResolutionConfigure).toHaveBeenCalled();
      });
    });

    it("subscribes to Hub events", async () => {
      renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(mockHubListen).toHaveBeenCalledWith(
          "datastore",
          expect.any(Function)
        );
      });
    });

    it("fetches initial network status", async () => {
      renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(mockNetInfoFetch).toHaveBeenCalled();
      });
    });

    it("subscribes to network status changes", async () => {
      renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(mockNetInfoAddEventListener).toHaveBeenCalled();
      });
    });
  });

  describe("network status", () => {
    it("updates network status when NetInfo reports online", async () => {
      mockNetInfoFetch.mockResolvedValue({ isConnected: true } as any);
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(result.current.networkStatus).toBe(NetworkStatus.Online);
      });
    });

    it.skip("updates network status when NetInfo reports offline", async () => {
      mockNetInfoFetch.mockResolvedValue({ isConnected: false } as any);
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(result.current.networkStatus).toBe(NetworkStatus.Offline);
      });
    });

    it.skip("updates network status from Hub events", async () => {
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(hubListener).toBeTruthy();
      });

      if (hubListener) {
        hubListener({
          payload: {
            event: "networkStatus",
            data: { active: false },
          },
        });
      }

      await waitFor(() => {
        expect(result.current.networkStatus).toBe(NetworkStatus.Offline);
      });
    });
  });

  describe("sync state", () => {
    it.skip("updates to Syncing when syncQueriesStarted event fires", async () => {
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(hubListener).toBeTruthy();
      });

      if (hubListener) {
        hubListener({
          payload: {
            event: "syncQueriesStarted",
            data: {},
          },
        });
      }

      await waitFor(() => {
        expect(result.current.syncState).toBe(SyncState.Syncing);
      });
    });

    it.skip("updates to Synced when syncQueriesReady event fires", async () => {
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(hubListener).toBeTruthy();
      });

      if (hubListener) {
        hubListener({
          payload: {
            event: "syncQueriesReady",
            data: {},
          },
        });
      }

      await waitFor(() => {
        expect(result.current.syncState).toBe(SyncState.Synced);
        expect(result.current.isReady).toBe(true);
      });
    });

    it.skip("updates to Error when syncQueriesError event fires", async () => {
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(hubListener).toBeTruthy();
      });

      if (hubListener) {
        hubListener({
          payload: {
            event: "syncQueriesError",
            data: {},
          },
        });
      }

      await waitFor(() => {
        expect(result.current.syncState).toBe(SyncState.Error);
      });
    });
  });

  describe("conflict detection", () => {
    it.skip("increments conflict count when conflict detected", async () => {
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(hubListener).toBeTruthy();
      });

      if (hubListener) {
        hubListener({
          payload: {
            event: "conflictDetected",
            data: {},
          },
        });
      }

      await waitFor(() => {
        expect(result.current.conflictCount).toBe(1);
      });
    });

    it.skip("increments conflict count multiple times", async () => {
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(hubListener).toBeTruthy();
      });

      if (hubListener) {
        hubListener({
          payload: {
            event: "conflictDetected",
            data: {},
          },
        });
        hubListener({
          payload: {
            event: "conflictDetected",
            data: {},
          },
        });
      }

      await waitFor(() => {
        expect(result.current.conflictCount).toBe(2);
      });
    });
  });

  describe("error handling", () => {
    it("handles DataStore initialization errors", async () => {
      mockDataStoreStart.mockRejectedValue(new Error("Init failed"));
      const { result } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(result.current.syncState).toBe(SyncState.Error);
      });
    });
  });

  describe("cleanup", () => {
    it("unsubscribes from Hub on unmount", async () => {
      const unsubscribe = jest.fn();
      mockHubListen.mockReturnValue(unsubscribe);
      const { unmount } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(mockHubListen).toHaveBeenCalled();
      });
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it("unsubscribes from NetInfo on unmount", async () => {
      const unsubscribe = jest.fn();
      mockNetInfoAddEventListener.mockReturnValue(unsubscribe);
      const { unmount } = renderHook(() => useAmplifyState());
      await waitFor(() => {
        expect(mockNetInfoAddEventListener).toHaveBeenCalled();
      });
      unmount();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
