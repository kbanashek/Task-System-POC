import {
  resetDataStore,
  waitForOutboxEmpty,
  type DataStoreLike,
} from "@utils/datastore/dataStoreReset";
import type { HubLike } from "@utils/datastore/dataStoreHub";

describe("dataStoreReset", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("waitForOutboxEmpty resolves true when outboxStatus isEmpty=true observed", async () => {
    const callbacks: Array<(d: unknown) => void> = [];
    const hub: HubLike = {
      listen: (_channel, cb) => {
        callbacks.push(cb);
        return () => {};
      },
    };

    const promise = waitForOutboxEmpty(hub, { timeoutMs: 1000 });
    callbacks[0]({
      payload: { event: "outboxStatus", data: { isEmpty: true } },
    });

    await expect(promise).resolves.toBe(true);
  });

  it("waitForOutboxEmpty resolves false on timeout", async () => {
    const hub: HubLike = { listen: () => () => {} };
    const promise = waitForOutboxEmpty(hub, { timeoutMs: 1000 });
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBe(false);
  });

  it("resetDataStore restart calls stop then start (best-effort)", async () => {
    const ds: DataStoreLike = {
      stop: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const hub: HubLike = { listen: () => () => {} };

    const promise = resetDataStore(
      { dataStore: ds, hub },
      { mode: "restart", waitForOutboxEmpty: false }
    );

    await promise;
    expect(ds.stop).toHaveBeenCalledTimes(1);
    expect(ds.start).toHaveBeenCalledTimes(1);
    expect(ds.clear).toHaveBeenCalledTimes(0);
  });

  it("resetDataStore clearAndRestart calls stop, clear, start", async () => {
    const ds: DataStoreLike = {
      stop: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const hub: HubLike = { listen: () => () => {} };

    const promise = resetDataStore(
      { dataStore: ds, hub },
      { mode: "clearAndRestart", waitForOutboxEmpty: false }
    );

    await promise;
    expect(ds.stop).toHaveBeenCalledTimes(1);
    expect(ds.clear).toHaveBeenCalledTimes(1);
    expect(ds.start).toHaveBeenCalledTimes(1);
  });

  it("resetDataStore proceeds when stop hangs and proceedOnStopTimeout=true", async () => {
    const ds: DataStoreLike = {
      stop: jest.fn().mockImplementation(() => new Promise(() => {})),
      start: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
    };
    const hub: HubLike = { listen: () => () => {} };

    const promise = resetDataStore(
      { dataStore: ds, hub },
      {
        mode: "restart",
        waitForOutboxEmpty: false,
        stopTimeoutMs: 1000,
        proceedOnStopTimeout: true,
      }
    );

    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toMatchObject({ stop: "timeout" });
    expect(ds.start).toHaveBeenCalledTimes(1);
  });
});
