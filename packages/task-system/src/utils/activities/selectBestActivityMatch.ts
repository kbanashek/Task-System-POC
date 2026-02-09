import type { Activity } from "@task-types/Activity";

/** Select the best Activity record for a lookup id (prefer hydrated config over stubs). @param activities - Candidate activities from DataStore. @param activityId - Lookup id (UUID only or `Activity.<uuid>`). @returns Best matching activity, or null. */
export const selectBestActivityMatch = (
  activities: readonly Activity[],
  activityId: string
): Activity | null => {
  const isMatch = (a: Activity): boolean => {
    if (a.pk === activityId || a.id === activityId) {
      return true;
    }
    if (!a.sk) {
      return false;
    }

    // Match "Activity.<uuid>" token in sk (covers ActivityRef chains too)
    if (a.sk.includes(`Activity.${activityId}`)) {
      return true;
    }

    // Match if sk ends with the raw id (UUID only)
    if (a.sk.endsWith(activityId)) {
      return true;
    }

    // Extract trailing Activity.<id> or UUID from sk and compare
    const skMatch =
      a.sk.match(/Activity\.([^#]+)$/) || a.sk.match(/([a-f0-9-]{36})$/i);
    if (skMatch && skMatch[1] === activityId) {
      return true;
    }

    return false;
  };

  const candidates = activities.filter(isMatch);
  if (candidates.length === 0) {
    return null;
  }

  const score = (a: Activity): number => {
    let s = 0;
    if (a.pk === activityId || a.id === activityId) {
      s += 1000;
    }
    if (a.sk?.includes(`Activity.${activityId}`)) {
      s += 200;
    }
    if (a.sk?.includes("ActivityRef#")) {
      s += 100;
    }
    if (a.sk?.startsWith("SK-")) {
      s -= 25;
    }
    if (typeof a.layouts === "string" && a.layouts.trim().length > 2) {
      s += 50;
    }
    if (
      typeof a.activityGroups === "string" &&
      a.activityGroups.trim().length > 2
    ) {
      s += 25;
    }
    s += (a._lastChangedAt ?? 0) / 1_000_000; // small tie-breaker weight
    return s;
  };

  return [...candidates].sort((a, b) => score(b) - score(a))[0] ?? null;
};
