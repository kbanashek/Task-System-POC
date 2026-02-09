/**
 * Adapter utility to transform LX's GraphQL getTasks response into TaskSystemFixture format.
 *
 * This enables validation that task-system can render the same tasks LX uses in production.
 */

import type { TaskSystemFixture } from "@task-types/../fixtures/TaskSystemFixture";
import type { CreateActivityInput } from "@task-types/Activity";
import type { CreateTaskInput } from "@task-types/Task";
import { TaskStatus, TaskType } from "@task-types/Task";

/**
 * LX GraphQL getTasks response structure
 */
export interface LXGetTasksResponse {
  data: {
    getTasks: {
      date: string;
      dayOffset: number;
      tasks: LXTask[];
    }[];
  };
}

/**
 * LX Task structure from GraphQL API
 */
export interface LXTask {
  /**
   * LX GraphQL tasks have pk/sk, but the LX in-memory task objects (e.g. Redux)
   * used by the integration harness may not. We generate stable pk/sk when missing.
   */
  pk?: string;
  sk?: string;
  title: string;
  taskType: string;
  status?: string;
  description?: string | null;
  taskInstanceId?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  /**
   * Some LX in-memory task objects include millisecond timestamps directly.
   * The GraphQL shape uses startTime/endTime strings, but we accept both.
   */
  startTimeInMillSec?: number | null;
  endTimeInMillSec?: number | null;
  dayOffset?: number | null;
  endDayOffset?: number | null;
  showBeforeStart?: boolean | null;
  allowEarlyCompletion?: boolean | null;
  allowLateCompletion?: boolean | null;
  allowLateEdits?: boolean | null;
  anchors?: unknown[] | string | null;
  anchorDayOffset?: number | null;
  actions?: unknown[] | string | null;
  hashKey?: string | null;
  occurrenceHashKey?: string | null;
  occurrenceParentHashKey?: string | null;
  parentTaskInstanceId?: string | null;
  tci?: {
    pk?: string;
    sk?: string;
    parentTaskInstanceId?: string;
    rescheduled?: number;
    canMoveSeriesWithVisit?: boolean;
    canRecall?: boolean;
  } | null;
  etci?: {
    pk?: string;
    startedBy?: string;
    startedAt?: string;
    startedByEvent?: string;
    endedAt?: string;
    endedBy?: string;
    endedByEvent?: string;
    latestTriggerAt?: string;
  } | null;
  rules?: unknown[] | string | null;
  isArchived?: boolean | null;
  isHidden?: boolean | null;
  isTranscribable?: boolean | null;
  systemName?: string | null;
  canRecall?: number | null; // Recall period in minutes
  noEndTime?: boolean | null;
  dueByLabel?: string | null; // Time label for grouping ("11:00 AM", "2:30 PM", etc.)
  showTask?: boolean | null; // Episodic task show flag
  taskTemplateId?: string | null;
  taskDefinitionId?: string | null;
  data?: string | null;
  icon?: string | null;
  offset?: number | null;
  endAfter?: number | null;
  activityAnswer?: string | null;
  activityResponse?: string | null;
  entityId?: string | null; // Activity reference (e.g., "ActivityRef#...#Activity.{uuid}" or "Activity.{uuid}")
  expireTimeInMillSec?: number | null;
  expireDate?: string | Date | null;
  date?: string | null; // ISO date string (e.g., "2024-01-15")
  statusBeforeExpired?: string | null; // Previous status before expiration
}

/**
 * Options for the adapter
 */
export interface LXToTaskSystemAdapterOptions {
  studyVersion?: string;
  studyStatus?: string;
  fixtureId?: string;
}

/** Transform an LX getTasks response into a TaskSystemFixture for import. */
export const lxToTaskSystemAdapter = (
  lxResponse: LXGetTasksResponse,
  options: LXToTaskSystemAdapterOptions = {}
): TaskSystemFixture => {
  const { studyVersion = "1.0", studyStatus = "LIVE", fixtureId } = options;

  // Flatten all tasks from all dates into a single array
  const allTasks: CreateTaskInput[] = [];
  /**
   * Track activity IDs referenced by tasks.
   *
   * We prefer the actual activity id (`Activity.<uuid>`) rather than the full ActivityRef.
   */
  const activityIdsSet = new Set<string>();

  lxResponse.data.getTasks.forEach(taskGroup => {
    taskGroup.tasks.forEach(lxTask => {
      // Filter out TIMED tasks with expireTimeInMillSec: 0 (expired/invalid tasks)
      // LX filters these out in shouldFilterTask as expired
      if (
        lxTask.taskType === "TIMED" &&
        (lxTask.expireTimeInMillSec === 0 ||
          lxTask.expireTimeInMillSec === null)
      ) {
        // Commented out for less log noise - uncomment to debug expired task filtering
        // console.warn(
        //   `[lxToTaskSystemAdapter] 🚫 Filtering out TIMED task with expireTimeInMillSec=0 (expired)`,
        //   {
        //     title: lxTask.title,
        //     pk: lxTask.pk,
        //     taskType: lxTask.taskType,
        //     expireTimeInMillSec: lxTask.expireTimeInMillSec,
        //   }
        // );
        return; // Skip this task
      }

      const transformedTask = transformLXTask(
        lxTask,
        studyVersion,
        studyStatus
      );
      allTasks.push(transformedTask);

      // Extract Activity IDs from task entityId (prefer Activity.<uuid> over ActivityRef#...)
      if (lxTask.entityId && typeof lxTask.entityId === "string") {
        const match =
          lxTask.entityId.match(/(?:^|#)(Activity\.[^#]+)(?:#|$)/) ??
          lxTask.entityId.match(/(?:^|#)(Activity\.[a-f0-9-]{36})(?:#|$)/i);
        activityIdsSet.add(match?.[1] ?? lxTask.entityId);
      }
    });
  });

  // Create minimal Activity stubs from extracted entityIds
  const activities: CreateActivityInput[] = Array.from(activityIdsSet).map(
    entityId => {
      // entityId is expected to be either "Activity.<uuid>" or a raw fallback string.
      // Keep pk as the full Activity.<uuid> token for parity with Lumiere's metadata filenames.
      const activityId = entityId;

      return {
        pk: activityId,
        // Use the same sk scheme as LX metadata hydration to avoid creating duplicate Activity rows.
        // See Lumiere `loadLxActivitiesFromMetadata` which uses `ActivityRef#${Activity.<uuid>}`.
        sk: `ActivityRef#${activityId}`,
        name: activityId,
        title: `Activity (from LX)`,
        type: "ACTIVITY",
        description: `Activity stub created from LX task entityId: ${entityId}`,
      };
    }
  );

  // Commented out for less log noise - uncomment to debug activity extraction
  // console.warn(
  //   "[lxToTaskSystemAdapter] ✅ Extracted activities from task entityIds",
  //   {
  //     totalActivities: activities.length,
  //     activityIds: activities.map(a => a.pk),
  //   }
  // );

  return {
    version: 1,
    fixtureId,
    activities,
    tasks: allTasks,
    questions: [],
    appointments: undefined,
  };
};

/**
 * Build a stable, deterministic key for an LX task when pk/sk are not present.
 *
 * The intent is "create once, then update": if the LX task content is the same
 * across reloads, this will produce the same pk, so FixtureImportService will
 * update the existing DataStore row instead of creating a new one.
 *
 * @param lxTask - LX task-like object (may be missing pk/sk)
 * @returns A stable base identifier string
 */
const getStableLxTaskBaseKey = (lxTask: LXTask): string => {
  // Prefer the most stable identifiers first.
  const preferredId =
    lxTask.pk ??
    lxTask.hashKey ??
    lxTask.occurrenceHashKey ??
    lxTask.taskDefinitionId ??
    lxTask.taskTemplateId ??
    // IMPORTANT: do NOT use taskInstanceId for identity.
    // In LX, taskInstanceId can be created/changed when the user starts a task,
    // which would cause our "stable" pk to change and make progress appear to reset.
    // Use semantic identifiers instead.
    lxTask.entityId ??
    null;

  if (preferredId) {
    return `lx:${preferredId}`;
  }

  // Fallback: use a content-derived key.
  // Keep the set small and stable (avoid including fields that change frequently).
  const date = lxTask.date ?? "";
  const title = lxTask.title ?? "";
  const type = lxTask.taskType ?? "";
  const start =
    typeof lxTask.startTimeInMillSec === "number"
      ? String(lxTask.startTimeInMillSec)
      : "";
  const expire =
    typeof lxTask.expireTimeInMillSec === "number"
      ? String(lxTask.expireTimeInMillSec)
      : "";

  return `lx:content:${type}:${date}:${start}:${expire}:${title}`;
};

/**
 * Simple stable hash (djb2) to generate compact keys for pk/sk.
 *
 * @param input - String to hash
 * @returns Short base36 hash
 */
const hashToBase36 = (input: string): string => {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) + hash + input.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
};

/**
 * Transform a single LX task into CreateTaskInput format.
 *
 * @param lxTask - The LX task object from GraphQL
 * @param studyVersion - Study version to assign
 * @param studyStatus - Study status to assign
 * @returns CreateTaskInput ready for DataStore
 */
const transformLXTask = (
  lxTask: LXTask,
  studyVersion: string,
  studyStatus: string
): CreateTaskInput => {
  // Convert actions array to JSON string if needed
  let actionsStr: string | null = null;
  let entityId: string | null = null;
  let hashKey: string | null = lxTask.hashKey ?? null;

  /**
   * Prefer the real activity id if present.
   * In LX, `actions[0].ref.activityId` is typically "Activity.<uuid>" and is the key
   * used to load the activity JSON from on-device metadata.
   */
  const normalizeEntityId = (raw: string | null | undefined): string | null => {
    if (!raw || typeof raw !== "string") return null;
    // If this is an ActivityRef chain, extract the Activity.<uuid> segment.
    const match =
      raw.match(/(?:^|#)(Activity\.[^#]+)(?:#|$)/) ??
      raw.match(/(?:^|#)(Activity\.[a-f0-9-]{36})(?:#|$)/i);
    return match?.[1] ?? raw;
  };

  // Seed from top-level entityId first (normalized).
  entityId = normalizeEntityId(lxTask.entityId);

  if (lxTask.actions) {
    if (Array.isArray(lxTask.actions)) {
      actionsStr = JSON.stringify(lxTask.actions);
      // Extract entityId from actions[0].entityId
      if (lxTask.actions.length > 0) {
        const firstAction = lxTask.actions[0] as { [key: string]: unknown };
        // Prefer ref.activityId if present; fallback to action entityId.
        const ref = firstAction?.ref as { [key: string]: unknown } | undefined;
        const refActivityId =
          ref?.activityId && typeof ref.activityId === "string"
            ? (ref.activityId as string)
            : null;
        const actionEntityId =
          firstAction?.entityId && typeof firstAction.entityId === "string"
            ? (firstAction.entityId as string)
            : null;

        entityId =
          normalizeEntityId(refActivityId ?? actionEntityId) ?? entityId;
        // Extract hashKey from actions[0].ref.hashKey if not already set
        if (
          !hashKey &&
          firstAction?.ref &&
          typeof firstAction.ref === "object"
        ) {
          const ref = firstAction.ref as { [key: string]: unknown };
          if (ref?.hashKey && typeof ref.hashKey === "string") {
            hashKey = ref.hashKey;
          }
        }
      }
    } else if (typeof lxTask.actions === "string") {
      actionsStr = lxTask.actions;
      // Try to parse to extract entityId and hashKey
      try {
        const parsed = JSON.parse(lxTask.actions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const firstAction = parsed[0] as { [key: string]: unknown };
          const ref = firstAction?.ref as
            | { [key: string]: unknown }
            | undefined;
          const refActivityId =
            ref?.activityId && typeof ref.activityId === "string"
              ? (ref.activityId as string)
              : null;
          const actionEntityId =
            firstAction?.entityId && typeof firstAction.entityId === "string"
              ? (firstAction.entityId as string)
              : null;

          entityId =
            normalizeEntityId(refActivityId ?? actionEntityId) ?? entityId;
          if (
            !hashKey &&
            firstAction?.ref &&
            typeof firstAction.ref === "object"
          ) {
            const ref = firstAction.ref as { [key: string]: unknown };
            if (ref?.hashKey && typeof ref.hashKey === "string") {
              hashKey = ref.hashKey;
            }
          }
        }
      } catch {
        // Invalid JSON, keep as-is
      }
    }
  }

  // Convert anchors array to JSON string if needed
  let anchorsStr: string | null = null;
  if (lxTask.anchors) {
    if (Array.isArray(lxTask.anchors)) {
      anchorsStr = JSON.stringify(lxTask.anchors);
    } else if (typeof lxTask.anchors === "string") {
      anchorsStr = lxTask.anchors;
    }
  }

  // Compute millisecond timestamps
  let startTimeInMillSec: number | null = null;
  if (lxTask.startTime) {
    try {
      const timestamp = new Date(lxTask.startTime).getTime();
      // Check for NaN (invalid date)
      startTimeInMillSec = isNaN(timestamp) ? null : timestamp;
    } catch {
      // Invalid date, leave as null
    }
  }

  let endTimeInMillSec: number | null = null;
  if (lxTask.endTime) {
    try {
      const timestamp = new Date(lxTask.endTime).getTime();
      // Check for NaN (invalid date)
      endTimeInMillSec = isNaN(timestamp) ? null : timestamp;
    } catch {
      // Invalid date, leave as null
    }
  }

  // Use LX's expireTimeInMillSec if available, otherwise compute from expireDate
  // Note: expireTimeInMillSec: 0 is allowed for episodic tasks
  let expireTimeInMillSec: number | null = null;
  if (typeof lxTask.expireTimeInMillSec === "number") {
    expireTimeInMillSec = lxTask.expireTimeInMillSec;
  } else if (lxTask.expireDate) {
    try {
      const timestamp = new Date(lxTask.expireDate).getTime();
      expireTimeInMillSec = isNaN(timestamp) ? null : timestamp;
    } catch {
      // Invalid date, leave as null
    }
  }

  // Extract tciSk from tci object
  const tciSk = lxTask.tci?.sk ?? null;

  // Normalize task type - respect the original taskType from LX data
  const taskType = normalizeTaskType(lxTask.taskType);

  // Log episodic task detection for debugging
  const isEpisodic =
    taskType === TaskType.EPISODIC ||
    String(taskType).toUpperCase() === "EPISODIC";

  // Commented out for less log noise - uncomment to debug episodic task detection
  // if (isEpisodic) {
  //   console.warn("[lxToTaskSystemAdapter] ✅ Episodic task detected", {
  //     title: lxTask.title,
  //     taskType: lxTask.taskType,
  //     normalizedTaskType: taskType,
  //     expireTimeInMillSec,
  //     pk: lxTask.pk,
  //   });
  // }

  // Normalize status
  const status = normalizeTaskStatus(lxTask.status);

  // Ensure pk/sk exist (DataStore requires these for sync + conflict resolution).
  const baseKey = getStableLxTaskBaseKey(lxTask);
  const stableId = hashToBase36(baseKey);
  const pk = lxTask.pk ?? `LX_TASK#${stableId}`;
  const sk = lxTask.sk ?? `TASK#${pk}`;

  return {
    pk,
    sk,
    title: lxTask.title,
    taskType,
    status,
    description: lxTask.description ?? null,
    taskInstanceId: lxTask.taskInstanceId ?? null,
    startTime: lxTask.startTime ?? null,
    startTimeInMillSec,
    endTime: lxTask.endTime ?? null,
    endTimeInMillSec,
    expireTimeInMillSec,
    dayOffset: lxTask.dayOffset ?? null,
    endDayOffset: lxTask.endDayOffset ?? null,
    date: lxTask.date ?? null, // ISO date string from LX
    localDateTime: null, // Will be calculated by parseTaskForPatientDate if needed
    statusBeforeExpired: lxTask.statusBeforeExpired ?? null,
    showBeforeStart: lxTask.showBeforeStart ?? null,
    allowEarlyCompletion: lxTask.allowEarlyCompletion ?? null,
    allowLateCompletion: lxTask.allowLateCompletion ?? null,
    allowLateEdits: lxTask.allowLateEdits ?? null,
    anchors: anchorsStr,
    anchorDayOffset: lxTask.anchorDayOffset ?? null,
    actions: actionsStr,
    entityId,
    activityIndex: null, // Not provided by LX
    activityAnswer: lxTask.activityAnswer ?? null,
    activityResponse: lxTask.activityResponse ?? null,
    syncState: null, // Will be set by DataStore
    syncStateTaskAnswer: null,
    syncStateTaskResult: null,
    syncStatus: null,
    hashKey,
    occurrenceHashKey: lxTask.occurrenceHashKey ?? null,
    occurrenceParentHashKey: lxTask.occurrenceParentHashKey ?? null,
    parentTaskInstanceId: lxTask.parentTaskInstanceId ?? null,
    tciSk,
    studyVersion,
    studyStatus,
    // LX Parity Fields
    noEndTime: lxTask.noEndTime ?? null,
    dueByLabel: lxTask.dueByLabel ?? null,
    dueByUpdated: null, // Will be computed during grouping if task is in recall period
    isHidden: lxTask.isHidden ?? null, // Episodic task visibility flag
    etci: lxTask.etci ?? null, // Episodic task control info (startedAt, endedAt)
    showTask: lxTask.showTask ?? null, // Episodic task show flag
    canRecall: lxTask.canRecall ?? null, // Recall period in minutes
  };
};

/**
 * Normalize LX task type to TaskType enum.
 */
const normalizeTaskType = (taskType: string): TaskType => {
  const upperType = taskType.toUpperCase();
  if (upperType === "SCHEDULED") return TaskType.SCHEDULED;
  if (upperType === "TIMED") return TaskType.TIMED;
  if (upperType === "EPISODIC") return TaskType.EPISODIC;
  // Default to SCHEDULED if unknown
  return TaskType.SCHEDULED;
};

/**
 * Normalize LX task status to TaskStatus enum.
 */
const normalizeTaskStatus = (status?: string): TaskStatus => {
  if (!status) return TaskStatus.OPEN;
  const upperStatus = status.toUpperCase();
  if (upperStatus === "OPEN") return TaskStatus.OPEN;
  if (upperStatus === "VISIBLE") return TaskStatus.VISIBLE;
  if (upperStatus === "STARTED") return TaskStatus.STARTED;
  if (upperStatus === "INPROGRESS") return TaskStatus.INPROGRESS;
  if (upperStatus === "COMPLETED") return TaskStatus.COMPLETED;
  if (upperStatus === "EXPIRED") return TaskStatus.EXPIRED;
  if (upperStatus === "RECALLED") return TaskStatus.RECALLED;
  // Default to OPEN if unknown
  return TaskStatus.OPEN;
};
