/**
 * Normalize a task/activity reference into a stable activity lookup id.
 *
 * Accepts:
 * - UUID or other stable id (returns as-is)
 * - `Activity.<id>` (strips `Activity.` and any `#version` suffix)
 * - `ActivityRef#...#Activity.<id>` (extracts trailing `Activity.<id>`)
 *
 * Important: a bare `"ActivityRef"` (or other ActivityRef* string without an `Activity.<id>` token)
 * is treated as invalid and returns null.
 *
 * @param raw - Raw reference string
 * @returns Normalized activity id, or null if not parseable
 */
export const normalizeActivityLookupId = (raw: string): string | null => {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  // Prefer extracting trailing Activity.<uuid> from ActivityRef chains.
  const activityRefMatch =
    raw.match(/(?:^|#)(Activity\.[^#]+)(?:#|$)/) ??
    raw.match(/(?:^|#)(Activity\.[a-f0-9-]{36})(?:#|$)/i);

  // If this looks like an ActivityRef but we couldn't extract an Activity.<id>, treat as invalid.
  if (!activityRefMatch?.[1] && raw.startsWith("ActivityRef")) {
    return null;
  }

  const token = activityRefMatch?.[1] ?? raw;
  const id = token.replace(/^Activity\./, "").split("#")[0];

  if (!id || id.trim().length === 0) {
    return null;
  }

  return id;
};
