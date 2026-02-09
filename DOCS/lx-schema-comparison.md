# LX Realm Schema vs Task-System Type Comparison

**Generated:** 2026-01-21  
**Purpose:** Document all fields from LX (Lumiere) Realm DB schemas to identify missing fields for LX parity.

---

## LX Realm Schemas

### TASK_SCHEMA_CONFIG (Timed/Scheduled Tasks)

**Source:** `orion-mobile/Lumiere/src/database/Schema.js` (lines 13-139)

| Field                     | Type   | Required | Default       | Notes                              |
| ------------------------- | ------ | -------- | ------------- | ---------------------------------- |
| `id`                      | string | ✅       | -             | Primary key (composite: `date#pk`) |
| `pk`                      | string | ✅       | -             | Partition key                      |
| `sk`                      | string | ✅       | -             | Sort key                           |
| `taskInstanceId`          | string | ❌       | -             | Task instance ID                   |
| `title`                   | string | ✅       | -             | Task title                         |
| `description`             | string | ❌       | -             | Task description                   |
| `showBeforeStart`         | bool   | ❌       | false         | Show before start time             |
| `allowEarlyCompletion`    | bool   | ❌       | -             | Allow early completion             |
| `allowLateCompletion`     | bool   | ❌       | -             | Allow late completion              |
| `allowLateEdits`          | bool   | ❌       | -             | Allow late edits                   |
| `data`                    | string | ❌       | -             | Additional task metadata (JSON)    |
| `startTime`               | string | ✅       | -             | Start time (HH:mm:ss format)       |
| `startTimeInMillSec`      | int    | ❌       | 0             | Start time in milliseconds         |
| `expireTimeInMillSec`     | int    | ❌       | 0             | Expiration time in milliseconds    |
| `endTimeInMillSec`        | int    | ❌       | 0             | End time in milliseconds           |
| `endTime`                 | string | ✅       | -             | End time (HH:mm:ss format)         |
| `icon`                    | string | ❌       | -             | Task icon identifier               |
| `dayOffset`               | int    | ❌       | 0             | Day offset for task                |
| `endDayOffset`            | int    | ❌       | 0             | End day offset                     |
| `offset`                  | int    | ✅       | -             | General offset                     |
| `endAfter`                | int    | ✅       | -             | Duration (end after X)             |
| `anchors`                 | string | ❌       | -             | Anchors (JSON)                     |
| `anchorDayOffset`         | int    | ❌       | -             | Anchor day offset                  |
| `anchorDayOffsetFrom`     | int    | ❌       | -             | Anchor day offset from             |
| `anchorDayOffsetTo`       | int    | ❌       | -             | Anchor day offset to               |
| `actions`                 | string | ❌       | -             | Actions (JSON)                     |
| `date`                    | string | ✅       | -             | Task date (ISO string)             |
| `dateDayOffset`           | int    | ✅       | -             | Date day offset                    |
| `status`                  | string | ❌       | 'OPEN'        | Task status                        |
| `statusBeforeExpired`     | string | ❌       | 'OPEN'        | Previous status before expiration  |
| `syncDateTime`            | string | ✅       | -             | Last sync timestamp                |
| `actualStartDateTime`     | string | ❌       | -             | Actual start date/time             |
| `actualEndDateTime`       | string | ❌       | -             | Actual end date/time               |
| `activityResponse`        | string | ❌       | -             | Activity response (encrypted)      |
| `studyVersion`            | string | ❌       | '1.0'         | Study version                      |
| `studyStatus`             | string | ❌       | -             | Study status                       |
| `syncState`               | int    | ❌       | 0             | Sync state                         |
| `activityAnswer`          | string | ❌       | -             | Activity answer (encrypted)        |
| `activityIndex`           | int    | ❌       | 0             | Activity index                     |
| `hashKey`                 | string | ❌       | -             | Hash key                           |
| `occurrenceHashKey`       | string | ❌       | -             | Occurrence hash key                |
| `occurrenceParentHashKey` | string | ❌       | -             | Occurrence parent hash key         |
| `entityId`                | string | ❌       | -             | Entity ID (activity)               |
| `localDateTime`           | date   | ❌       | -             | Local date/time calculation        |
| `taskType`                | string | ✅       | -             | Task type (SCHEDULED/TIMED)        |
| `syncStatus`              | string | ❌       | '0'           | Sync status                        |
| `dueByLabel`              | string | ❌       | -             | Due by label (e.g., "11:00 AM")    |
| `submitActivityDate`      | date   | ❌       | null          | Activity submission date           |
| `startActivityDate`       | date   | ❌       | new Date()    | Activity start date                |
| `componentMessageError`   | string | ❌       | -             | Component error message            |
| `taskTemplateId`          | string | ❌       | -             | Task template ID                   |
| `noEndTime`               | bool   | ❌       | false         | No end time flag                   |
| `stickyButtonTop`         | string | ❌       | -             | UI: sticky button position         |
| `parentTaskInstanceId`    | string | ❌       | -             | Parent task instance ID            |
| `syncStateTaskAnswer`     | int    | ❌       | 0             | Sync state for task answer         |
| `syncStateTaskResult`     | int    | ❌       | 0             | Sync state for task result         |
| `taskTimezone`            | string | ❌       | device TZ     | Task timezone                      |
| `taskTimezoneOffset`      | string | ❌       | device offset | Task timezone offset               |
| `resumable`               | string | ❌       | ''            | Resumable flag                     |
| `transcribable`           | string | ❌       | ''            | Transcribable flag                 |
| `displayHistoryDetail`    | string | ❌       | 'ENABLE'      | Display history detail flag        |
| `createdBy`               | string | ❌       | ''            | Created by user ID                 |
| `completedBy`             | string | ❌       | ''            | Completed by user ID               |
| `rules`                   | string | ❌       | -             | Task rules (JSON)                  |
| `isDeleted`               | bool   | ❌       | false         | Soft delete flag                   |
| `isAdditionalRecurrence`  | bool   | ❌       | false         | Additional recurrence flag         |
| `taskDefinitionId`        | string | ❌       | -             | Task definition ID                 |
| `isTranscribable`         | string | ❌       | ''            | Transcribable flag (v2)            |
| `isTranscribed`           | bool   | ❌       | false         | Transcribed flag                   |
| `tciSk`                   | string | ❌       | ''            | Task control instance SK           |
| `isArchived`              | bool   | ❌       | false         | Archived flag                      |
| `rescheduled`             | int    | ❌       | -             | Rescheduled count                  |
| `isArchivedByMobile`      | bool   | ❌       | false         | Archived by mobile flag            |
| `canRecall`               | int    | ❌       | -             | Recall period (minutes)            |
| `canMoveSeriesWithVisit`  | string | ❌       | ''            | Move series with visit flag        |
| `isHidden`                | bool   | ❌       | false         | Hidden flag (task visibility)      |
| `systemName`              | string | ❌       | -             | System name identifier             |

---

### EPISODIC_TASK_SCHEMA_CONFIG (Episodic Tasks)

**Source:** `orion-mobile/Lumiere/src/database/Schema.js` (lines 141-220)

| Field                   | Type   | Required | Default  | Notes                             |
| ----------------------- | ------ | -------- | -------- | --------------------------------- |
| `id`                    | string | ✅       | -        | Primary key                       |
| `pk`                    | string | ✅       | -        | Partition key                     |
| `sk`                    | string | ✅       | -        | Sort key                          |
| `title`                 | string | ✅       | -        | Task title                        |
| `description`           | string | ❌       | -        | Task description                  |
| `showBeforeStart`       | bool   | ❌       | false    | Show before start time            |
| `allowEarlyCompletion`  | bool   | ❌       | -        | Allow early completion            |
| `allowLateCompletion`   | bool   | ❌       | -        | Allow late completion             |
| `allowLateEdits`        | bool   | ❌       | -        | Allow late edits                  |
| `data`                  | string | ❌       | -        | Additional task metadata (JSON)   |
| `icon`                  | string | ❌       | -        | Task icon identifier              |
| `offset`                | int    | ❌       | 0        | General offset                    |
| `endAfter`              | int    | ❌       | 0        | Duration (end after X)            |
| `anchors`               | string | ❌       | -        | Anchors (JSON)                    |
| `anchorDayOffset`       | int    | ❌       | -        | Anchor day offset                 |
| `anchorDayOffsetFrom`   | int    | ❌       | -        | Anchor day offset from            |
| `anchorDayOffsetTo`     | int    | ❌       | -        | Anchor day offset to              |
| `actions`               | string | ❌       | -        | Actions (JSON)                    |
| `status`                | string | ❌       | 'OPEN'   | Task status                       |
| `statusBeforeExpired`   | string | ❌       | 'OPEN'   | Previous status before expiration |
| `syncDateTime`          | string | ✅       | -        | Last sync timestamp               |
| `activityResponse`      | string | ❌       | -        | Activity response (encrypted)     |
| `studyVersion`          | string | ❌       | '1.0'    | Study version                     |
| `studyStatus`           | string | ❌       | -        | Study status                      |
| `syncState`             | int    | ❌       | 0        | Sync state                        |
| `activityAnswer`        | string | ❌       | -        | Activity answer (encrypted)       |
| `activityIndex`         | int    | ❌       | 0        | Activity index                    |
| `hashKey`               | string | ❌       | -        | Hash key                          |
| `entityId`              | string | ❌       | -        | Entity ID (activity)              |
| `localDateTime`         | date   | ❌       | -        | Local date/time calculation       |
| `taskType`              | string | ✅       | -        | Task type (EPISODIC)              |
| `componentMessageError` | string | ❌       | -        | Component error message           |
| `taskTemplateId`        | string | ❌       | -        | Task template ID                  |
| `submitActivityDate`    | date   | ❌       | null     | Activity submission date          |
| `noEndTime`             | bool   | ❌       | false    | No end time flag                  |
| `occurrenceHashKey`     | string | ❌       | -        | Occurrence hash key               |
| `resumable`             | string | ❌       | ''       | Resumable flag                    |
| `transcribable`         | string | ❌       | ''       | Transcribable flag                |
| `displayHistoryDetail`  | string | ❌       | 'ENABLE' | Display history detail flag       |
| `createdBy`             | string | ❌       | ''       | Created by user ID                |
| `completedBy`           | string | ❌       | ''       | Completed by user ID              |
| `rules`                 | string | ❌       | -        | Task rules (JSON)                 |
| `taskDefinitionId`      | string | ❌       | -        | Task definition ID                |
| `isTranscribable`       | string | ❌       | ''       | Transcribable flag (v2)           |
| `isTranscribed`         | bool   | ❌       | false    | Transcribed flag                  |
| `etci`                  | string | ❌       | -        | Episodic task control info (JSON) |
| `showTask`              | bool   | ❌       | true     | Show task flag                    |
| `canRecall`             | int    | ❌       | -        | Recall period (minutes)           |
| `isHidden`              | bool   | ❌       | false    | Hidden flag (task visibility)     |
| `systemName`            | string | ❌       | -        | System name identifier            |

---

## Current Task-System Type

**Source:** `orion-task-system/packages/task-system/src/types/Task.ts`

### Fields Present in Task Type ✅

- `id`, `pk`, `sk`, `taskInstanceId`
- `title`, `description`
- `startTime`, `startTimeInMillSec`, `expireTimeInMillSec`, `endTimeInMillSec`, `endTime`
- `dayOffset`, `endDayOffset`
- `taskType`, `status`
- `showBeforeStart`, `allowEarlyCompletion`, `allowLateCompletion`, `allowLateEdits`
- `noEndTime`, `dueByLabel`, `dueByUpdated`, `isHidden`, `etci`, `showTask`, `canRecall`
- `anchors`, `anchorDayOffset`, `actions`
- `entityId`, `activityIndex`, `activityAnswer`, `activityResponse`
- `syncState`, `syncStateTaskAnswer`, `syncStateTaskResult`, `syncStatus`
- `hashKey`, `occurrenceHashKey`, `occurrenceParentHashKey`, `parentTaskInstanceId`, `tciSk`
- `studyVersion`, `studyStatus`
- DataStore fields: `createdAt`, `updatedAt`, `_version`, `_deleted`, `_lastChangedAt`

---

## Missing Fields Analysis

### ⚠️ **Critical for LX Parity** (Task Display/Behavior)

| Field                 | Type   | Why Critical              | LX Usage                 |
| --------------------- | ------ | ------------------------- | ------------------------ |
| `icon`                | string | Task icons in UI          | Used for task type icons |
| `date`                | string | Original date from server | Date calculation/display |
| `dateDayOffset`       | int    | Day offset for date       | Date calculation         |
| `offset`              | int    | General offset            | Task scheduling          |
| `endAfter`            | int    | Duration                  | Task scheduling          |
| `localDateTime`       | date   | Calculated local time     | Task grouping/filtering  |
| `syncDateTime`        | string | Last sync timestamp       | Sync tracking            |
| `submitActivityDate`  | date   | Activity submission time  | History/display          |
| `startActivityDate`   | date   | Activity start time       | History/display          |
| `statusBeforeExpired` | string | Previous status           | Status tracking          |
| `actualStartDateTime` | string | Actual start time         | History tracking         |
| `actualEndDateTime`   | string | Actual end time           | History tracking         |

### 🔧 **Useful for Features** (Not Blocking)

| Field                   | Type   | Why Useful              | LX Usage            |
| ----------------------- | ------ | ----------------------- | ------------------- |
| `data`                  | string | Additional metadata     | Extra task data     |
| `taskTemplateId`        | string | Template reference      | Task templates      |
| `componentMessageError` | string | Error messages          | Error handling      |
| `anchorDayOffsetFrom`   | int    | Anchor range from       | Advanced anchoring  |
| `anchorDayOffsetTo`     | int    | Anchor range to         | Advanced anchoring  |
| `resumable`             | string | Resume support          | Task resumability   |
| `transcribable`         | string | Transcription support   | Audio transcription |
| `displayHistoryDetail`  | string | History display flag    | History UI          |
| `createdBy`             | string | Creator user ID         | Multi-user tracking |
| `completedBy`           | string | Completer user ID       | Multi-user tracking |
| `rules`                 | string | Task rules              | Business logic      |
| `taskDefinitionId`      | string | Task definition ID      | Task definitions    |
| `isTranscribable`       | string | Transcribable flag (v2) | Audio transcription |
| `isTranscribed`         | bool   | Transcribed flag        | Audio transcription |
| `systemName`            | string | System identifier       | Task naming         |

### 🗑️ **Internal/Legacy** (Probably Not Needed)

| Field                    | Type   | Why Not Needed      | Notes                    |
| ------------------------ | ------ | ------------------- | ------------------------ |
| `stickyButtonTop`        | string | UI state            | UI-specific              |
| `taskTimezone`           | string | Timezone            | Use device TZ            |
| `taskTimezoneOffset`     | string | Timezone offset     | Use device offset        |
| `isDeleted`              | bool   | Soft delete         | Use DataStore `_deleted` |
| `isAdditionalRecurrence` | bool   | Recurrence flag     | LX-specific              |
| `isArchived`             | bool   | Archive flag        | LX-specific              |
| `rescheduled`            | int    | Reschedule count    | LX-specific              |
| `isArchivedByMobile`     | bool   | Mobile archive flag | LX-specific              |
| `canMoveSeriesWithVisit` | string | Series movement     | LX-specific              |

---

## Recommendations

### Phase 1: Add Critical Fields (For LX Parity)

Add these fields to `Task` interface to ensure proper LX parity:

```typescript
export interface Task {
  // ... existing fields ...

  // Critical for LX parity
  icon?: string | null;
  date?: string | null;
  dateDayOffset?: number | null;
  offset?: number | null;
  endAfter?: number | null;
  localDateTime?: Date | null;
  syncDateTime?: string | null;
  submitActivityDate?: Date | null;
  startActivityDate?: Date | null;
  statusBeforeExpired?: string | null;
  actualStartDateTime?: string | null;
  actualEndDateTime?: string | null;
  anchorDayOffsetFrom?: number | null;
  anchorDayOffsetTo?: number | null;
}
```

### Phase 2: Add Useful Feature Fields (Optional)

Add these if needed for specific features:

```typescript
export interface Task {
  // ... phase 1 fields ...

  // Useful features
  data?: string | null; // Additional metadata (JSON)
  taskTemplateId?: string | null;
  componentMessageError?: string | null;
  resumable?: string | null;
  transcribable?: string | null;
  displayHistoryDetail?: string | null;
  createdBy?: string | null;
  completedBy?: string | null;
  rules?: string | null;
  taskDefinitionId?: string | null;
  isTranscribable?: string | null;
  isTranscribed?: boolean | null;
  systemName?: string | null;
}
```

### Phase 3: Update Adapter

Update `lxToTaskSystemAdapter` to map all new fields from LX GraphQL response.

### Phase 4: Update Filtering/Sorting

Ensure all LX filtering/sorting logic uses the correct fields (especially `date`, `dateDayOffset`, `localDateTime`).

---

## Notes

1. **Composite `id` field**: LX uses `date#pk` as the composite primary key. Task-system uses DataStore's auto-generated `id`. This difference should be handled in the adapter.

2. **Encrypted fields**: LX encrypts `activityAnswer` and `activityResponse`. Task-system doesn't need to handle encryption at the type level (DataStore handles it).

3. **Date handling**: LX stores dates as strings (`date`, `syncDateTime`) and calculates local times (`localDateTime`). Task-system should preserve these for LX compatibility.

4. **Status tracking**: LX tracks `statusBeforeExpired` for status history. This is useful for recall/undo functionality.

5. **Multi-user fields**: `createdBy` and `completedBy` are useful for multi-user scenarios but may not be needed for initial MVP.

---

## Next Steps

1. **Decide which fields to add** based on LX parity requirements
2. **Update `Task` interface** in `packages/task-system/src/types/Task.ts`
3. **Update `lxToTaskSystemAdapter`** to map new fields
4. **Update tests** to cover new fields
5. **Validate against LX behavior** using actual LX data
