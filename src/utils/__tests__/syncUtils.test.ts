/**
 * Unit tests for syncUtils
 * Tests DataStore sync utilities including timeout-protected stop
 */

import { DataStore } from "@aws-amplify/datastore";
import { forceFullSync, clearCacheAndResync } from "../syncUtils";

// Mock DataStore
jest.mock("@aws-amplify/datastore", () => ({
  DataStore: {
    stop: jest.fn(),
    clear: jest.fn(),
    start: jest.fn(),
  },
}));

// Mock deviceLogger from package
jest.mock("@orion/task-system", () => ({
  ...jest.requireActual("@orion/task-system"),
  logWithDevice: jest.fn(),
  logErrorWithDevice: jest.fn(),
}));

describe("syncUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("forceFullSync", () => {
    it("should stop and start DataStore with timeout protection", async () => {
      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      const startMock = DataStore.start as jest.Mock;

      stopMock.mockResolvedValueOnce(undefined);
      startMock.mockResolvedValueOnce(undefined);

      // Act
      const promise = forceFullSync();

      // Run all timers and flush promises
      await jest.runAllTimersAsync();

      await promise;

      // Assert
      expect(stopMock).toHaveBeenCalledTimes(1);
      expect(startMock).toHaveBeenCalledTimes(1);
    });

    it("should proceed after 5s timeout if DataStore.stop() hangs", async () => {
      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      const startMock = DataStore.start as jest.Mock;

      // Make stop() never resolve (simulate hang)
      stopMock.mockImplementation(() => new Promise(() => {}));
      startMock.mockResolvedValueOnce(undefined);

      // Act
      const promise = forceFullSync();

      // Run all timers and flush promises
      await jest.runAllTimersAsync();

      await promise;

      // Assert - should still call start() even though stop() timed out
      expect(stopMock).toHaveBeenCalledTimes(1);
      expect(startMock).toHaveBeenCalledTimes(1);
    });

    it("should handle errors from DataStore.stop()", async () => {
      jest.useRealTimers(); // Use real timers for error test

      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      stopMock.mockRejectedValueOnce(new Error("Stop failed"));

      // Act & Assert - error should be propagated
      await expect(forceFullSync()).rejects.toThrow("Stop failed");

      jest.useFakeTimers(); // Restore fake timers
    });

    it("should handle errors from DataStore.start()", async () => {
      jest.useRealTimers(); // Use real timers for error test

      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      const startMock = DataStore.start as jest.Mock;

      stopMock.mockResolvedValueOnce(undefined);
      startMock.mockRejectedValueOnce(new Error("Start failed"));

      // Act & Assert - error should be propagated
      await expect(forceFullSync()).rejects.toThrow("Start failed");

      jest.useFakeTimers(); // Restore fake timers
    });
  });

  describe("clearCacheAndResync", () => {
    it("should stop, clear, and start DataStore with timeout protection", async () => {
      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      const clearMock = DataStore.clear as jest.Mock;
      const startMock = DataStore.start as jest.Mock;

      stopMock.mockResolvedValueOnce(undefined);
      clearMock.mockResolvedValueOnce(undefined);
      startMock.mockResolvedValueOnce(undefined);

      // Act
      const promise = clearCacheAndResync();

      // Run all timers
      await jest.runAllTimersAsync();

      await promise;

      // Assert
      expect(stopMock).toHaveBeenCalledTimes(1);
      expect(clearMock).toHaveBeenCalledTimes(1);
      expect(startMock).toHaveBeenCalledTimes(1);
    });

    it("should proceed after timeout if DataStore.stop() hangs", async () => {
      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      const clearMock = DataStore.clear as jest.Mock;
      const startMock = DataStore.start as jest.Mock;

      // Make stop() never resolve
      stopMock.mockImplementation(() => new Promise(() => {}));
      clearMock.mockResolvedValueOnce(undefined);
      startMock.mockResolvedValueOnce(undefined);

      // Act
      const promise = clearCacheAndResync();

      // Run all timers
      await jest.runAllTimersAsync();

      await promise;

      // Assert - should still call clear() and start() even though stop() timed out
      expect(stopMock).toHaveBeenCalledTimes(1);
      expect(clearMock).toHaveBeenCalledTimes(1);
      expect(startMock).toHaveBeenCalledTimes(1);
    });

    it("should handle errors from DataStore.clear()", async () => {
      jest.useRealTimers(); // Use real timers for error test

      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      const clearMock = DataStore.clear as jest.Mock;

      stopMock.mockResolvedValueOnce(undefined);
      clearMock.mockRejectedValueOnce(new Error("Clear failed"));

      // Act & Assert - error should be propagated
      await expect(clearCacheAndResync()).rejects.toThrow("Clear failed");

      jest.useFakeTimers(); // Restore fake timers
    });

    it("should handle errors from DataStore.start()", async () => {
      jest.useRealTimers(); // Use real timers for error test

      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      const clearMock = DataStore.clear as jest.Mock;
      const startMock = DataStore.start as jest.Mock;

      stopMock.mockResolvedValueOnce(undefined);
      clearMock.mockResolvedValueOnce(undefined);
      startMock.mockRejectedValueOnce(new Error("Start failed"));

      // Act & Assert - error should be propagated
      await expect(clearCacheAndResync()).rejects.toThrow("Start failed");

      jest.useFakeTimers(); // Restore fake timers
    });
  });

  describe("timeout protection", () => {
    it("should log timeout warning when DataStore.stop() times out", async () => {
      // Arrange
      const stopMock = DataStore.stop as jest.Mock;
      const { logWithDevice } = require("../deviceLogger");

      // Make stop() never resolve
      stopMock.mockImplementation(() => new Promise(() => {}));
      (DataStore.start as jest.Mock).mockResolvedValueOnce(undefined);

      // Act
      const promise = forceFullSync();

      // Run all timers
      await jest.runAllTimersAsync();

      await promise;

      // Assert - should have logged timeout warning
      expect(logWithDevice).toHaveBeenCalledWith(
        "syncUtils",
        expect.stringContaining("timed out after 5000ms")
      );
    });
  });
});
