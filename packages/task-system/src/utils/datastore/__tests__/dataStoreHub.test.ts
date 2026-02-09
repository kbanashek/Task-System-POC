import {
  listenToDataStoreHub,
  normalizeDataStoreEventName,
  parseDataStoreHubEvent,
  waitForDataStoreInitialSync,
  type HubLike,
} from "@utils/datastore/dataStoreHub";

describe("dataStoreHub utilities", () => {
  describe("parseDataStoreHubEvent", () => {
    it("returns null for non-object payloads", () => {
      expect(parseDataStoreHubEvent(null)).toBeNull();
      expect(parseDataStoreHubEvent("nope")).toBeNull();
      expect(parseDataStoreHubEvent({})).toBeNull();
      expect(parseDataStoreHubEvent({ payload: "bad" })).toBeNull();
      expect(parseDataStoreHubEvent({ payload: { event: 123 } })).toBeNull();
    });

    it("parses event + data when present", () => {
      expect(
        parseDataStoreHubEvent({
          payload: { event: "ready", data: { ok: true } },
        })
      ).toEqual({ event: "ready", data: { ok: true } });
    });
  });

  describe("normalizeDataStoreEventName", () => {
    it("normalizes legacy/alternate event names", () => {
      expect(normalizeDataStoreEventName("ready")).toBe("syncQueriesReady");
      expect(normalizeDataStoreEventName("syncQueriesFailed")).toBe(
        "syncQueriesError"
      );
    });

    it("passes through unknown events", () => {
      expect(normalizeDataStoreEventName("outboxStatus")).toBe("outboxStatus");
    });
  });

  describe("listenToDataStoreHub", () => {
    it("invokes handler only for parseable events", () => {
      const handler = jest.fn();
      const callbacks: Array<(d: unknown) => void> = [];
      const unsubscribe = jest.fn();

      const hub: HubLike = {
        listen: (_channel, cb) => {
          callbacks.push(cb);
          return unsubscribe;
        },
      };

      const stop = listenToDataStoreHub(hub, handler);

      // Not parseable
      callbacks[0]({ payload: { event: 123 } });
      expect(handler).not.toHaveBeenCalled();

      callbacks[0]({ payload: { event: "ready", data: {} } });
      expect(handler).toHaveBeenCalledWith({ event: "ready", data: {} });

      stop();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe("waitForDataStoreInitialSync", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("resolves ready on legacy 'ready' event", async () => {
      const callbacks: Array<(d: unknown) => void> = [];
      const unsubscribe = jest.fn();
      const hub: HubLike = {
        listen: (_channel, cb) => {
          callbacks.push(cb);
          return unsubscribe;
        },
      };

      const promise = waitForDataStoreInitialSync(hub, { timeoutMs: 1000 });
      callbacks[0]({ payload: { event: "ready", data: {} } });

      await expect(promise).resolves.toEqual({
        outcome: "ready",
        event: "syncQueriesReady",
      });
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it("resolves failed on sync failure event", async () => {
      const callbacks: Array<(d: unknown) => void> = [];
      const unsubscribe = jest.fn();
      const hub: HubLike = {
        listen: (_channel, cb) => {
          callbacks.push(cb);
          return unsubscribe;
        },
      };

      const promise = waitForDataStoreInitialSync(hub, { timeoutMs: 1000 });
      callbacks[0]({ payload: { event: "syncQueriesFailed", data: {} } });

      await expect(promise).resolves.toEqual({
        outcome: "failed",
        event: "syncQueriesError",
      });
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it("resolves timeout when no events arrive", async () => {
      const unsubscribe = jest.fn();
      const hub: HubLike = {
        listen: () => unsubscribe,
      };

      const promise = waitForDataStoreInitialSync(hub, { timeoutMs: 1000 });
      jest.advanceTimersByTime(1000);

      await expect(promise).resolves.toEqual({ outcome: "timeout" });
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
