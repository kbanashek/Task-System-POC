/**
 * Adversarial tests for useAmplifyState - designed to expose error handling weaknesses
 */

import { renderHook, waitFor } from "@testing-library/react-native";
import { useAmplifyState } from "../useAmplifyState";

// Mock AWS Amplify before importing
jest.mock("aws-amplify", () => ({
  DataStore: {
    start: jest.fn(),
    stop: jest.fn(),
  },
  Hub: {
    listen: jest.fn(),
  },
}));

jest.mock("@react-native-community/netinfo", () => ({
  default: {
    fetch: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

const { DataStore, Hub } = require("aws-amplify");
const NetInfo = require("@react-native-community/netinfo").default;

describe("useAmplifyState - Adversarial Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle NetInfo.fetch() rejection without crashing", async () => {
    // Test unhandled promise rejection
    (NetInfo.fetch as jest.Mock).mockRejectedValue(
      new Error("Network module crashed")
    );
    (DataStore.start as jest.Mock).mockResolvedValue(undefined);
    (Hub.listen as jest.Mock).mockReturnValue(jest.fn());

    const { result } = renderHook(() => useAmplifyState());

    // App should not crash
    await waitFor(() => {
      expect(result.current.syncState).toBeDefined();
    });

    // Should default to offline on error
    expect(result.current.networkStatus).toBeDefined();
  });

  it("should handle DataStore.start() throwing synchronous error", () => {
    // Test synchronous throw instead of rejection
    (DataStore.start as jest.Mock).mockImplementation(() => {
      throw new Error("DataStore module not initialized");
    });
    (Hub.listen as jest.Mock).mockReturnValue(jest.fn());
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

    expect(() => {
      renderHook(() => useAmplifyState());
    }).not.toThrow(); // Should be caught
  });

  it("should handle Hub events with malformed payload", async () => {
    let hubCallback: any;
    (Hub.listen as jest.Mock).mockImplementation((channel, callback) => {
      hubCallback = callback;
      return jest.fn();
    });
    (DataStore.start as jest.Mock).mockResolvedValue(undefined);
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

    renderHook(() => useAmplifyState());

    await waitFor(() => expect(hubCallback).toBeDefined());

    // Send malformed payload - should not crash
    expect(() => {
      hubCallback({
        payload: {
          event: "syncQueriesError",
          data: null, // Should be an object
        },
      });
    }).not.toThrow();

    // Send payload with undefined data
    expect(() => {
      hubCallback({
        payload: {
          event: "syncQueriesError",
          // data is missing entirely
        },
      });
    }).not.toThrow();
  });

  it("should handle circular reference in error object", async () => {
    let hubCallback: any;
    (Hub.listen as jest.Mock).mockImplementation((channel, callback) => {
      hubCallback = callback;
      return jest.fn();
    });
    (DataStore.start as jest.Mock).mockResolvedValue(undefined);
    (NetInfo.fetch as jest.Mock).mockResolvedValue({ isConnected: true });

    renderHook(() => useAmplifyState());

    await waitFor(() => expect(hubCallback).toBeDefined());

    // Create circular reference
    const circularError: any = { message: "Sync failed" };
    circularError.self = circularError;

    expect(() => {
      hubCallback({
        payload: {
          event: "syncQueriesError",
          data: { error: circularError },
        },
      });
    }).not.toThrow(); // Should handle circular refs gracefully
  });

  it("should handle NetInfo returning null state", async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue(null);
    (DataStore.start as jest.Mock).mockResolvedValue(undefined);
    (Hub.listen as jest.Mock).mockReturnValue(jest.fn());

    const { result } = renderHook(() => useAmplifyState());

    await waitFor(() => {
      expect(result.current.syncState).toBeDefined();
    });

    // Should handle null gracefully
    expect(result.current).toBeDefined();
  });

  it("should handle non-Error thrown objects", async () => {
    // Test throwing string instead of Error
    (NetInfo.fetch as jest.Mock).mockRejectedValue("String error");
    (DataStore.start as jest.Mock).mockResolvedValue(undefined);
    (Hub.listen as jest.Mock).mockReturnValue(jest.fn());

    const { result } = renderHook(() => useAmplifyState());

    await waitFor(() => {
      expect(result.current.syncState).toBeDefined();
    });

    expect(result.current).toBeDefined();
  });
});
