/**
 * DataStore Hub utilities.
 *
 * Centralizes parsing and lifecycle waiting for AWS Amplify DataStore Hub events
 * to keep behavior consistent across hooks/services (offline-first stability).
 */

/**
 * Minimal Hub-like interface used by this utility (works for `@aws-amplify/core` Hub).
 */
export interface HubLike {
  /**
   * Subscribe to a Hub channel.
   *
   * @param channel - Hub channel name (e.g. "datastore")
   * @param callback - Listener invoked with hub event payloads
   * @returns Unsubscribe handle (Amplify Hub has varied return shapes across versions)
   */
  listen: (
    channel: string,
    callback: (hubData: unknown) => void
  ) => (() => void) | { remove: () => void } | void;
}

/** Parsed DataStore Hub event. */
export interface DataStoreHubEvent {
  /** Event name, e.g. "ready", "syncQueriesReady", "outboxStatus", etc. */
  event: string;
  /** Event data payload (shape depends on event type). */
  data: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Parse a Hub event object into a normalized DataStore hub event.
 *
 * Amplify Hub event callback payloads are not strongly typed; this narrows safely.
 *
 * @param hubData - Raw hub event payload from Hub.listen callback
 * @returns Parsed DataStoreHubEvent or null if not parseable
 */
export const parseDataStoreHubEvent = (
  hubData: unknown
): DataStoreHubEvent | null => {
  if (!isObject(hubData)) return null;

  const payload = hubData.payload;
  if (!isObject(payload)) return null;

  const event = payload.event;
  if (typeof event !== "string" || event.trim().length === 0) return null;

  return { event, data: payload.data };
};

/**
 * Normalize DataStore event names across Amplify versions.
 *
 * Some environments emit `ready` while others emit `syncQueriesReady`.
 * Some failure paths emit `syncQueriesFailed` instead of `syncQueriesError`.
 *
 * @param event - Raw event name
 * @returns Normalized event name
 */
export const normalizeDataStoreEventName = (event: string): string => {
  const map: Record<string, string> = {
    ready: "syncQueriesReady",
    syncQueriesFailed: "syncQueriesError",
  };

  return map[event] ?? event;
};

/**
 * Subscribe to the DataStore Hub channel with safe parsing.
 *
 * @param hub - Amplify Hub-like instance
 * @param handler - Callback invoked for parsed events only
 * @returns Unsubscribe function
 */
export const listenToDataStoreHub = (
  hub: HubLike,
  handler: (event: DataStoreHubEvent) => void
): (() => void) => {
  const unsubscribeHandle = hub.listen("datastore", hubData => {
    const parsed = parseDataStoreHubEvent(hubData);
    if (!parsed) return;
    handler(parsed);
  });

  // Normalize Amplify Hub unsubscribe shapes:
  // - Some versions return a function
  // - Some return an object with `remove()`
  // - Some return void
  if (typeof unsubscribeHandle === "function") {
    return unsubscribeHandle;
  }
  if (
    typeof unsubscribeHandle === "object" &&
    unsubscribeHandle !== null &&
    typeof (unsubscribeHandle as { remove?: unknown }).remove === "function"
  ) {
    return () => (unsubscribeHandle as { remove: () => void }).remove();
  }
  return () => {};
};

export type DataStoreInitialSyncOutcome = "ready" | "failed" | "timeout";

export interface WaitForInitialSyncOptions {
  /** Timeout in milliseconds before resolving with outcome "timeout". Default: 15000. */
  timeoutMs?: number;
  /**
   * Event names that indicate initial sync is ready. Defaults include both legacy and modern event names.
   * (Values are normalized internally.)
   */
  readyEvents?: readonly string[];
  /**
   * Event names that indicate initial sync failed. Defaults include common failure event names.
   * (Values are normalized internally.)
   */
  failureEvents?: readonly string[];
}

/**
 * Wait for DataStore "initial sync is ready" (or failure/timeout) via Hub events.
 *
 * This is intentionally conservative: it resolves on "ready" OR "syncQueriesReady",
 * and it never throws (callers can proceed with best-effort behavior).
 *
 * @param hub - Amplify Hub-like instance
 * @param options - Wait options for timeout and event names
 * @returns Outcome and the triggering (normalized) event name if applicable
 */
export const waitForDataStoreInitialSync = async (
  hub: HubLike,
  options: WaitForInitialSyncOptions = {}
): Promise<{ outcome: DataStoreInitialSyncOutcome; event?: string }> => {
  const timeoutMs = options.timeoutMs ?? 15000;
  const readyEvents = new Set(
    (options.readyEvents ?? ["ready", "syncQueriesReady"]).map(e =>
      normalizeDataStoreEventName(e)
    )
  );
  const failureEvents = new Set(
    (options.failureEvents ?? ["syncQueriesFailed", "syncQueriesError"]).map(
      e => normalizeDataStoreEventName(e)
    )
  );

  return await new Promise(resolve => {
    let resolved = false;

    const finish = (outcome: DataStoreInitialSyncOutcome, event?: string) => {
      if (resolved) return;
      resolved = true;
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      resolve({ outcome, event });
    };

    const unsubscribe = listenToDataStoreHub(hub, ({ event }) => {
      const normalized = normalizeDataStoreEventName(event);
      if (readyEvents.has(normalized)) {
        finish("ready", normalized);
        return;
      }
      if (failureEvents.has(normalized)) {
        finish("failed", normalized);
      }
    });

    const timeoutId = setTimeout(() => {
      finish("timeout");
    }, timeoutMs);
  });
};
