/**
 * Service logger utility for package services
 * Uses the package's centralized logging service
 */

import { getServiceLogger as getPackageServiceLogger } from "@services/logging/serviceLogger";
import type { LogMetadata } from "@services/logging/types";
import {
  logErrorWithPlatform,
  logWithPlatform,
} from "@utils/logging/platformLogger";

/**
 * Valid service names for typed logging
 */
export type ServiceName =
  | "ActivityService"
  | "App"
  | "AppointmentService"
  | "ConflictResolution"
  | "DataPointService"
  | "ErrorBoundary"
  | "FileSystemUtils"
  | "GroupedTasksView"
  | "ImageCaptureQuestion"
  | "ImageStorageService"
  | "LanguageSelector"
  | "MultiSelectQuestion"
  | "NavigationMenu"
  | "NavigationService"
  | "NumberQuestion"
  | "QuestionScreenContent"
  | "QuestionService"
  | "questionValidation"
  | "SingleSelectQuestion"
  | "TaskAnswerService"
  | "TaskHistoryService"
  | "TaskResultService"
  | "TaskService"
  | "taskUtils"
  | "TempAnswerSyncService"
  | "TextQuestion"
  | "TranslatedText"
  | "TranslationProvider"
  | "TranslationService"
  | "useActivityData"
  | "useAmplifyState"
  | "useDataPointInstance"
  | "useDataPointList"
  | "useQuestionList"
  | "useQuestionNavigation"
  | "useQuestionsScreen"
  | "useQuestionSubmission"
  | "useTaskAnswer"
  | "useTaskAnswerList"
  | "useTaskCard"
  | "useTaskContainer"
  | "useTaskForm"
  | "useTaskHistoryList"
  | "useTaskResultList"
  | "useTaskUpdate"
  | "useTranslatedText"
  | "useTranslation";

interface ServiceLogger {
  debug: (
    message: string,
    metadata?: LogMetadata | unknown,
    step?: string,
    icon?: string
  ) => void;
  info: (
    message: string,
    metadata?: LogMetadata | unknown,
    step?: string,
    icon?: string
  ) => void;
  warn: (
    message: string,
    metadata?: LogMetadata | unknown,
    step?: string,
    icon?: string
  ) => void;
  error: (
    message: string,
    error?: unknown,
    step?: string,
    icon?: string
  ) => void;
}

const loggerCache = new Map<ServiceName, ServiceLogger>();

/**
 * Get a logger instance for a specific service
 * Tries to use main app's centralized logging service if available,
 * falls back to platformLogger for standalone package usage
 *
 * @param serviceName - Name of the service (e.g., "TaskService", "AppointmentService")
 * @returns Logger instance with service name pre-configured
 */
export function getServiceLogger(serviceName: ServiceName): ServiceLogger {
  // Check cache first
  const cached = loggerCache.get(serviceName);
  if (cached) {
    return cached;
  }

  // Try to use package's centralized logging service first
  try {
    const packageLogger = getPackageServiceLogger(serviceName);
    loggerCache.set(serviceName, packageLogger as ServiceLogger);
    return packageLogger as ServiceLogger;
  } catch {
    // Logging service not initialized - fall back to platformLogger
  }

  // Package logging service not available - use platformLogger fallback
  const logger = {
    debug: (
      message: string,
      metadata?: unknown,
      step?: string,
      icon?: string
    ) => {
      if (__DEV__) {
        logWithPlatform(
          icon || "🔍",
          step || "",
          serviceName,
          message,
          metadata as { [key: string]: unknown }
        );
      }
    },
    info: (
      message: string,
      metadata?: unknown,
      step?: string,
      icon?: string
    ) => {
      logWithPlatform(
        icon || "ℹ️",
        step || "",
        serviceName,
        message,
        metadata as { [key: string]: unknown }
      );
    },
    warn: (
      message: string,
      metadata?: unknown,
      step?: string,
      icon?: string
    ) => {
      logWithPlatform(
        icon || "⚠️",
        step || "",
        serviceName,
        message,
        metadata as { [key: string]: unknown }
      );
    },
    error: (
      message: string,
      error?: unknown,
      step?: string,
      _icon?: string
    ) => {
      logErrorWithPlatform(step || "", serviceName, message, error);
    },
  };

  // Cache the logger
  loggerCache.set(serviceName, logger as ServiceLogger);
  return logger as ServiceLogger;
}
