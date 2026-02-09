import { ConsoleLogger } from "@aws-amplify/core";

/**
 * Installs a narrow log filter to suppress the noisy Amplify DataStore warning:
 * "Data won't be synchronized. No GraphQL endpoint configured..."
 *
 * This is useful for **Option A** integrations (LX local-only mode) where the host
 * intentionally does not provide a GraphQL endpoint for task-system DataStore sync.
 *
 * Important:
 * - This does **not** change DataStore behavior; it only filters one specific warning.
 * - The patch is idempotent and safe to call multiple times.
 */
export const installAmplifyDataStoreNoEndpointWarningFilter = (): void => {
  const warnKey = "__orionTaskSystemOriginalWarn__";

  const proto = ConsoleLogger.prototype as unknown as Record<string, unknown>;

  if (typeof proto[warnKey] === "function") {
    // Already installed.
    return;
  }

  const originalWarn = ConsoleLogger.prototype.warn as unknown as (
    this: ConsoleLogger,
    ...msg: unknown[]
  ) => void;

  proto[warnKey] = originalWarn;

  ConsoleLogger.prototype.warn = function (
    this: ConsoleLogger,
    ...msg: unknown[]
  ): void {
    const first = msg[0];
    const isDataStore = this?.name === "DataStore";
    const isTargetMessage =
      typeof first === "string" &&
      first.includes(
        "Data won't be synchronized. No GraphQL endpoint configured."
      );

    if (isDataStore && isTargetMessage) {
      return;
    }

    originalWarn.call(this, ...msg);
  };
};
