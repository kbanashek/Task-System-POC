/**
 * Platform-aware logging utility
 * All logs must include platform identification (iOS, Android, or Web)
 */

// Don't import react-native's Platform at module-evaluation time to avoid
// "import after the Jest environment has been torn down" errors in tests.
import { PACKAGE_SOURCE } from "@constants/packageSource";

const PLATFORM_ICONS: { [key: string]: string } = {
  ios: "🍎",
  android: "🤖",
  web: "🌐",
} as const;

/**
 * Get platform identifier for logging
 * @returns Platform identifier emoji (e.g., "🍎", "🤖", "🌐")
 */
export const getPlatformId = (): string => {
  try {
    // If running under Jest, prefer an env override or default to web
    if (process.env.JEST_WORKER_ID) {
      const override = process.env.PLATFORM_ICON;
      if (override) return override;
      return PLATFORM_ICONS.web;
    }

    // Lazy-require react-native's Platform to avoid top-level native imports
    // which can cause issues in Node/Jest environments when the RN env
    // isn't initialized or is torn down.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform } = require("react-native");
    return PLATFORM_ICONS[Platform?.OS] || "❓";
  } catch (e) {
    // Fallback to web platform icon when react-native Platform isn't available
    return PLATFORM_ICONS.web;
  }
};

/**
 * Create a log message with platform prefix
 * New format: [Platform:task-system:ServiceName - STEP] : icon message
 * Or: [Platform:task-system:ServiceName] : icon message
 *
 * @param icon - Emoji icon for the log type (will be inline in message)
 * @param step - Step identifier (e.g., "INIT-1", "DATA-1", or empty string)
 * @param serviceName - Name of the service/module logging
 * @param message - The log message
 * @returns Formatted log message string
 */
export const formatLogMessage = (
  icon: string,
  step: string,
  serviceName: string,
  message: string
): string => {
  const platform = getPlatformId();
  const iconPart = icon ? `${icon} ` : "";
  const messageWithIcon = `${iconPart}${message}`;

  if (step) {
    // Initialization/data flow logs: [Platform:task-system:ServiceName - STEP] : message
    return `[${platform}:${PACKAGE_SOURCE}:${serviceName} - ${step}] : ${messageWithIcon}`;
  } else {
    // Function logs: [Platform:task-system:ServiceName] : message
    return `[${platform}:${PACKAGE_SOURCE}:${serviceName}] : ${messageWithIcon}`;
  }
};

/**
 * Log with platform identification
 * Use this for all console.log calls to ensure platform is always included
 *
 * NOTE: This utility uses console directly and is used internally by the package.
 * For React components, prefer using the useLogger() hook.
 * For services, prefer using getServiceLogger() from the logging service.
 *
 * @param icon - Emoji icon for the log type
 * @param step - Step identifier (e.g., "INIT-1", "DATA-1", or empty string)
 * @param serviceName - Name of the service/module logging
 * @param message - The log message
 * @param data - Optional data object to log
 */
export const logWithPlatform = (
  icon: string,
  step: string,
  serviceName: string,
  message: string,
  data?: { [key: string]: unknown }
): void => {
  // Main app services should use the centralized logging service
  const formattedMessage = formatLogMessage(icon, step, serviceName, message);
  if (data) {
    console.info(formattedMessage, data);
  } else {
    console.info(formattedMessage);
  }
};

/**
 * Log error with platform identification
 * Use this for all console.error calls to ensure platform is always included
 *
 * NOTE: This utility uses console directly and is used internally by the package.
 * For React components, prefer using the useLogger() hook.
 * For services, prefer using getServiceLogger() from the logging service.
 *
 * @param step - Step identifier (e.g., "INIT-1", "DATA-1", or empty string)
 * @param serviceName - Name of the service/module logging
 * @param message - The error message
 * @param error - Optional error object (will extract message only)
 */
export const logErrorWithPlatform = (
  step: string,
  serviceName: string,
  message: string,
  error?: unknown
): void => {
  // Use console directly - package is self-contained
  // Main app services should use the centralized logging service
  const platform = getPlatformId();
  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : "";
  const fullMessage = `${message}${errorMessage ? ` - ${errorMessage}` : ""}`;

  if (step) {
    // Initialization/data flow logs: [Platform:task-system:ServiceName - STEP] : ❌ message
    console.error(
      `[${platform}:${PACKAGE_SOURCE}:${serviceName} - ${step}] : ❌ ${fullMessage}`
    );
  } else {
    // Function logs: [Platform:task-system:ServiceName] : ❌ message
    console.error(
      `[${platform}:${PACKAGE_SOURCE}:${serviceName}] : ❌ ${fullMessage}`
    );
  }
};
