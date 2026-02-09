/**
 * Service logger helper
 * Provides easy access to logging service for non-React contexts (services, utilities)
 *
 * Usage in services:
 * ```typescript
 * import { getServiceLogger } from "@utils/logging/serviceLogger";
 *
 * const logger = getServiceLogger("TaskService");
 * logger.info("Task created", { taskId: "123" });
 * logger.error("Failed to create task", error);
 * ```
 */

import { getLoggingService } from "@services/LoggingService";

/**
 * Get a logger instance for a specific service
 * This is the recommended way for services and utilities to access logging
 *
 * @param serviceName - Name of the service (e.g., "TaskService", "AppointmentService")
 * @returns Logger instance with service name pre-configured
 */
export function getServiceLogger(serviceName: string) {
  try {
    const loggingService = getLoggingService();
    return loggingService.createLogger(serviceName);
  } catch {
    // Fallback logger if logging service not initialized
    // This can happen during early initialization
    return {
      debug: (
        message: string,
        metadata?: unknown,
        step?: string,
        icon?: string
      ) => {
        if (__DEV__) {
          const formatted = formatMessage(serviceName, message, step, icon);
          if (metadata) {
            console.info(formatted, metadata);
          } else {
            console.info(formatted);
          }
        }
      },
      info: (
        message: string,
        metadata?: unknown,
        step?: string,
        icon?: string
      ) => {
        const formatted = formatMessage(serviceName, message, step, icon);
        if (metadata) {
          console.info(formatted, metadata);
        } else {
          console.info(formatted);
        }
      },
      warn: (
        message: string,
        metadata?: unknown,
        step?: string,
        icon?: string
      ) => {
        const formatted = formatMessage(serviceName, message, step, icon);
        if (metadata) {
          console.warn(formatted, metadata);
        } else {
          console.warn(formatted);
        }
      },
      error: (
        message: string,
        error?: unknown,
        step?: string,
        icon?: string
      ) => {
        const formatted = formatMessage(
          serviceName,
          message,
          step,
          icon || "❌"
        );
        const errorMsg =
          error instanceof Error ? error.message : error ? String(error) : "";
        const fullMessage = errorMsg ? `${formatted} - ${errorMsg}` : formatted;
        console.error(fullMessage);
      },
    };
  }
}

/**
 * Formats a log message with platform, source, service name, and optional step/icon.
 *
 * @param serviceName - Name of the service generating the log
 * @param message - The log message content
 * @param step - Optional step identifier (e.g., "INIT-1", "DATA-2")
 * @param icon - Optional emoji icon to prefix the message
 * @returns Formatted log message string
 *
 * @example
 * formatMessage("TaskService", "Task created", "DATA-1", "📋")
 * // Returns: "[🍎:task-system:TaskService - DATA-1] : 📋 Task created"
 */
function formatMessage(
  serviceName: string,
  message: string,
  step?: string,
  icon?: string
): string {
  // Direct platform detection
  const platformIcons: { [key: string]: string } = {
    ios: "🍎",
    android: "🤖",
    web: "🌐",
  };
  // Guard access to Platform in case the React Native runtime is not available
  let platform = "❓";
  try {
    // Avoid requiring react-native during Jest runs or after environment teardown.
    // If running under Jest, prefer environment overrides instead of requiring RN.
    if (process && process.env && process.env.JEST_WORKER_ID) {
      // Allow test environment to override platform icon via env var if needed
      platform = (process.env.PLATFORM_ICON as string) || "❓";
    } else {
      // Lazy-require react-native to avoid importing Platform at module load time
      // which can cause issues when the React Native runtime is not available.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      try {
        const rn = require("react-native");
        const os = (rn && rn.Platform && (rn.Platform as any).OS) || undefined;
        platform = os ? platformIcons[os] || "❓" : "❓";
      } catch (e) {
        platform = "❓";
      }
    }
  } catch (e) {
    platform = "❓";
  }

  const iconPart = icon ? `${icon} ` : "";
  const messageWithIcon = `${iconPart}${message}`;
  const source = "task-system"; // Package source

  if (step) {
    return `[${platform}:${source}:${serviceName} - ${step}] : ${messageWithIcon}`;
  } else {
    return `[${platform}:${source}:${serviceName}] : ${messageWithIcon}`;
  }
}
