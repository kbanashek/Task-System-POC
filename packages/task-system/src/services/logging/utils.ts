/**
 * Logging utility functions
 * Shared utilities for log level mappings and conversions
 */

import { LogLevel, LogLevelPreset } from "@services/logging/types";
import {
  formatObjectForLog,
  parseJsonStrings,
} from "@utils/logging/logFormatter";

/**
 * Sentry severity level constants
 */
export const SENTRY_SEVERITY = {
  DEBUG: "debug",
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
} as const;

/**
 * Native logging severity level constants
 */
export const NATIVE_SEVERITY = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
} as const;

/**
 * Sentry severity levels
 * Maps to Sentry's SeverityLevel type
 */
export type SentrySeverity =
  | typeof SENTRY_SEVERITY.DEBUG
  | typeof SENTRY_SEVERITY.INFO
  | typeof SENTRY_SEVERITY.WARNING
  | typeof SENTRY_SEVERITY.ERROR;

/**
 * Native severity levels
 */
export type NativeSeverity =
  | typeof NATIVE_SEVERITY.DEBUG
  | typeof NATIVE_SEVERITY.INFO
  | typeof NATIVE_SEVERITY.WARN
  | typeof NATIVE_SEVERITY.ERROR;

/**
 * Map LogLevel to Sentry severity
 * Sentry uses "warning" instead of "warn"
 */
const LOG_LEVEL_TO_SENTRY_SEVERITY: Record<LogLevel, SentrySeverity> = {
  [LogLevel.VERBOSE]: SENTRY_SEVERITY.DEBUG,
  [LogLevel.DEBUG]: SENTRY_SEVERITY.DEBUG,
  [LogLevel.INFO]: SENTRY_SEVERITY.INFO,
  [LogLevel.WARN]: SENTRY_SEVERITY.WARNING,
  [LogLevel.ERROR]: SENTRY_SEVERITY.ERROR,
};

export function mapLogLevelToSentrySeverity(level: LogLevel): SentrySeverity {
  return LOG_LEVEL_TO_SENTRY_SEVERITY[level] ?? SENTRY_SEVERITY.INFO;
}

/**
 * Map LogLevel to react-native-logs severity string
 */
const LOG_LEVEL_TO_NATIVE_SEVERITY: Record<LogLevel, NativeSeverity> = {
  [LogLevel.VERBOSE]: NATIVE_SEVERITY.DEBUG,
  [LogLevel.DEBUG]: NATIVE_SEVERITY.DEBUG,
  [LogLevel.INFO]: NATIVE_SEVERITY.INFO,
  [LogLevel.WARN]: NATIVE_SEVERITY.WARN,
  [LogLevel.ERROR]: NATIVE_SEVERITY.ERROR,
};

export function mapLogLevelToNativeSeverity(level: LogLevel): NativeSeverity {
  return LOG_LEVEL_TO_NATIVE_SEVERITY[level] ?? NATIVE_SEVERITY.INFO;
}

/**
 * Convert LogLevelPreset to LogLevel
 */
export function presetToLogLevel(preset: LogLevelPreset): LogLevel {
  switch (preset) {
    case LogLevelPreset.VERBOSE:
      return LogLevel.VERBOSE;
    case LogLevelPreset.DEBUG:
      return LogLevel.DEBUG;
    case LogLevelPreset.INFO:
      return LogLevel.INFO;
    case LogLevelPreset.WARN:
      return LogLevel.WARN;
    case LogLevelPreset.ERROR_ONLY:
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO;
  }
}

/**
 * Format metadata as inline string for single-line logs
 */
export function formatMetadataInline(
  metadata?: Record<string, unknown>
): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "";
  }

  const safeStringify = (value: unknown): string => {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Unserializable]";
    }
  };

  const parts: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      // For nested objects, stringify compactly
      parts.push(`${key}: ${safeStringify(value).replace(/\s+/g, " ")}`);
    } else if (Array.isArray(value)) {
      parts.push(`${key}: [${value.length}]`);
    } else {
      parts.push(`${key}: ${value}`);
    }
  }

  return parts.length > 0 ? ` {${parts.join(", ")}}` : "";
}

/**
 * Format metadata as multi-line string for readable logs
 * Automatically parses JSON strings in metadata
 */
export function formatMetadataMultiLine(
  metadata?: Record<string, unknown>
): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "";
  }

  // Parse any JSON strings in metadata
  const parsed = parseJsonStrings(metadata) as Record<string, unknown>;

  // Format as multi-line
  const formatted = formatObjectForLog(parsed);

  return formatted ? `\n${formatted}` : "";
}

/**
 * Format log entry for sequence diagram (with indentation/arrows)
 */
export function formatSequenceDiagram(
  step: string | undefined,
  serviceName: string,
  message: string,
  icon?: string
): string {
  if (!step) {
    return message;
  }

  // Extract step number for indentation
  const stepMatch = step.match(/^(INIT|DATA)-?(\d+)(?:\.(\d+))?/);
  if (!stepMatch) {
    return message;
  }

  const [, , major, minor] = stepMatch;
  const depth = parseInt(major, 10) + (minor ? parseInt(minor, 10) * 0.1 : 0);

  // Indentation: 2 spaces per level
  const indent = "  ".repeat(Math.floor(depth - 1));
  const arrow = depth > 1 ? "→ " : "";

  const iconPart = icon ? `${icon} ` : "";
  return `${indent}${arrow}${iconPart}${message}`;
}
