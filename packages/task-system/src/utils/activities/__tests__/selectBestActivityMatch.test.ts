import type { Activity } from "@task-types/Activity";
import { selectBestActivityMatch } from "@utils/activities/selectBestActivityMatch";

describe("selectBestActivityMatch", () => {
  it("returns null when no candidates match", () => {
    const activities: Activity[] = [
      { id: "1", pk: "Activity.aaa", sk: "ActivityRef#Activity.aaa" },
    ];

    expect(selectBestActivityMatch(activities, "does-not-match")).toBeNull();
  });

  it("prefers an ActivityRef hydrated record with layouts over a stub SK- record", () => {
    const uuid = "ad93b50d-7d49-4128-8a59-91275e77f3c8";

    const stub: Activity = {
      id: "stub",
      pk: `Activity.${uuid}`,
      sk: `SK-Activity.${uuid}`,
      layouts: null,
      activityGroups: null,
      _lastChangedAt: 1,
    };

    const hydrated: Activity = {
      id: "hydrated",
      pk: `Activity.${uuid}`,
      sk: `ActivityRef#Activity.${uuid}`,
      layouts: JSON.stringify({ layouts: [{ type: "MOBILE", screens: [] }] }),
      activityGroups: JSON.stringify([]),
      _lastChangedAt: 2,
    };

    const selected = selectBestActivityMatch([stub, hydrated], uuid);
    expect(selected?.id).toBe("hydrated");
  });

  it("prefers exact pk/id match when provided", () => {
    const a1: Activity = {
      id: "1",
      pk: "ACTIVITY-1",
      sk: "SK-1",
      layouts: null,
      activityGroups: null,
    };

    const a2: Activity = {
      id: "2",
      pk: "ACTIVITY-2",
      sk: "SK-2",
      layouts: JSON.stringify({}),
      activityGroups: null,
    };

    expect(selectBestActivityMatch([a2, a1], "ACTIVITY-1")?.id).toBe("1");
    expect(selectBestActivityMatch([a2, a1], "2")?.id).toBe("2");
  });
});
