import type { HubLike } from "@utils/datastore/dataStoreHub";
import {
  listenToDataStoreHub,
  normalizeDataStoreEventName,
} from "@utils/datastore/dataStoreHub";
import { getServiceLogger } from "@utils/logging/serviceLogger";

/** Minimal DataStore-like interface (used for testability). */
export interface DataStoreLike {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clear: () => Promise<void>;
}

export interface WaitForOutboxEmptyOptions {
  /** Timeout before giving up and returning false. Default: 2000ms. */
  timeoutMs?: number;
  /** If true, log debug output. Default: false. */
  debug?: boolean;
}

/**
 * Wait until the DataStore outbox is empty, best-effort.
 *
 * This helps avoid known cases where `DataStore.stop()` can hang when there are
 * pending outbox mutations (offline-first safety).
 *
 * Returns `true` when an outbox-empty signal is observed, otherwise `false` on timeout.
 */
export async function waitForOutboxEmpty(
  hub: HubLike,
  options: WaitForOutboxEmptyOptions = {}
): Promise<boolean> {
  const timeoutMs = options.timeoutMs ?? 2000;
  const logger = getServiceLogger("DataStoreReset");

  return await new Promise(resolve => {
    let done = false;

    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      resolve(value);
    };

    const unsubscribe = listenToDataStoreHub(hub, ({ event, data }) => {
      const normalized = normalizeDataStoreEventName(event);
      if (normalized !== "outboxStatus") return;

      const isEmpty =
        typeof (data as { isEmpty?: unknown })?.isEmpty === "boolean"
          ? ((data as { isEmpty?: boolean }).isEmpty as boolean)
          : undefined;

      if (options.debug) {
        logger.debug("Observed outboxStatus", { isEmpty });
      }

      if (isEmpty === true) {
        finish(true);
      }
    });

    const timeoutId = setTimeout(() => {
      if (options.debug) {
        logger.warn("Timed out waiting for outbox empty", { timeoutMs });
      }
      finish(false);
    }, timeoutMs);
  });
}

export interface TimeoutOptions {
  /** Timeout for stop/start/clear. */
  timeoutMs: number;
  /** If true, proceed on timeout instead of throwing. */
  proceedOnTimeout: boolean;
}

async function withTimeout(
  label: string,
  action: () => Promise<void>,
  options: TimeoutOptions
): Promise<"ok" | "timeout"> {
  const logger = getServiceLogger("DataStoreReset");
  const { timeoutMs, proceedOnTimeout } = options;

  let didTimeout = false;
  await Promise.race([
    action(),
    new Promise<void>(resolve => {
      setTimeout(() => {
        didTimeout = true;
        logger.warn(`${label} timed out`, { timeoutMs });
        resolve();
      }, timeoutMs);
    }),
  ]);

  if (didTimeout && !proceedOnTimeout) {
    throw new Error(`${label} timed out after ${timeoutMs}ms`);
  }

  return didTimeout ? "timeout" : "ok";
}

export type DataStoreResetMode = "restart" | "clearAndRestart";

export interface DataStoreResetOptions {
  mode: DataStoreResetMode;

  /** If true, wait briefly for outbox empty before stopping. Default: true. */
  waitForOutboxEmpty?: boolean;
  /** Outbox wait timeout. Default: 2000ms. */
  outboxTimeoutMs?: number;

  /** Stop timeout. Default: 5000ms. */
  stopTimeoutMs?: number;
  /** Clear timeout. Default: 5000ms. */
  clearTimeoutMs?: number;
  /** Start timeout. Default: 5000ms. */
  startTimeoutMs?: number;

  /** If true, proceed even when stop hangs. Default: true. */
  proceedOnStopTimeout?: boolean;
  /** If true, proceed even when start hangs (rare). Default: false. */
  proceedOnStartTimeout?: boolean;
  /** If true, proceed even when clear hangs (rare). Default: false. */
  proceedOnClearTimeout?: boolean;

  /** If true, enable debug logs. Default: false. */
  debug?: boolean;
}

export interface DataStoreResetResult {
  outboxEmptyObserved: boolean;
  stop: "ok" | "timeout";
  clear?: "ok" | "timeout";
  start: "ok" | "timeout";
}

/**
 * Centralized, best-effort DataStore reset.
 *
 * - Adds timeouts around stop/clear/start
 * - Optionally waits briefly for outbox to be empty before stopping
 *
 * This is designed for dev tooling and recovery flows.
 */
export async function resetDataStore(
  deps: {
    dataStore: DataStoreLike;
    hub: HubLike;
  },
  options: DataStoreResetOptions
): Promise<DataStoreResetResult> {
  const logger = getServiceLogger("DataStoreReset");
  const mode = options.mode;
  const debug = options.debug ?? false;

  const outboxEmptyObserved =
    (options.waitForOutboxEmpty ?? true)
      ? await waitForOutboxEmpty(deps.hub, {
          timeoutMs: options.outboxTimeoutMs ?? 2000,
          debug,
        })
      : false;

  if (debug) {
    logger.info("Reset starting", { mode, outboxEmptyObserved });
  }

  const stop = await withTimeout(
    "DataStore.stop()",
    () => deps.dataStore.stop(),
    {
      timeoutMs: options.stopTimeoutMs ?? 5000,
      proceedOnTimeout: options.proceedOnStopTimeout ?? true,
    }
  );

  let clear: "ok" | "timeout" | undefined;
  if (mode === "clearAndRestart") {
    clear = await withTimeout(
      "DataStore.clear()",
      () => deps.dataStore.clear(),
      {
        timeoutMs: options.clearTimeoutMs ?? 5000,
        proceedOnTimeout: options.proceedOnClearTimeout ?? false,
      }
    );
  }

  const start = await withTimeout(
    "DataStore.start()",
    () => deps.dataStore.start(),
    {
      timeoutMs: options.startTimeoutMs ?? 5000,
      proceedOnTimeout: options.proceedOnStartTimeout ?? false,
    }
  );

  if (debug) {
    logger.info("Reset finished", {
      mode,
      outboxEmptyObserved,
      stop,
      clear,
      start,
    });
  }

  return { outboxEmptyObserved, stop, clear, start };
}
