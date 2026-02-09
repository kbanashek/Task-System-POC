/**
 * Unit tests for lxToTaskSystemAdapter
 */

import { lxToTaskSystemAdapter } from "../lxToTaskSystemAdapter";
import type { LXGetTasksResponse, LXTask } from "../lxToTaskSystemAdapter";
import { TaskType, TaskStatus } from "@task-types/Task";

describe("lxToTaskSystemAdapter", () => {
  describe("basic transformation", () => {
    it("should transform a minimal LX task", () => {
      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [
                {
                  pk: "task-123",
                  sk: "sk-123",
                  title: "Test Task",
                  taskType: "SCHEDULED",
                },
              ],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);

      expect(fixture.version).toBe(1);
      expect(fixture.tasks).toHaveLength(1);
      expect(fixture.tasks[0]).toMatchObject({
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: TaskType.SCHEDULED,
        status: TaskStatus.OPEN,
      });
    });

    it("should set default values for optional fields", () => {
      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [
                {
                  pk: "task-123",
                  sk: "sk-123",
                  title: "Test Task",
                  taskType: "SCHEDULED",
                },
              ],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.description).toBeNull();
      expect(task.taskInstanceId).toBeNull();
      expect(task.startTime).toBeNull();
      expect(task.startTimeInMillSec).toBeNull();
      expect(task.endTime).toBeNull();
      expect(task.endTimeInMillSec).toBeNull();
      expect(task.expireTimeInMillSec).toBeNull();
    });

    it("should apply options to fixture", () => {
      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [
                {
                  pk: "task-123",
                  sk: "sk-123",
                  title: "Test Task",
                  taskType: "SCHEDULED",
                },
              ],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse, {
        studyVersion: "2.5",
        studyStatus: "BUILD",
        fixtureId: "test-fixture",
      });

      expect(fixture.fixtureId).toBe("test-fixture");
      expect(fixture.tasks[0].studyVersion).toBe("2.5");
      expect(fixture.tasks[0].studyStatus).toBe("BUILD");
    });

    it("should generate stable pk/sk when LX task does not include them", () => {
      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2026-01-23",
              dayOffset: 0,
              tasks: [
                {
                  // pk/sk intentionally missing (matches LX in-memory task objects)
                  title: "Episodic Task 01",
                  taskType: "EPISODIC",
                  date: "2026-01-23",
                  taskDefinitionId: "TaskDefinition.abc123",
                } as unknown as LXTask,
              ],
            },
          ],
        },
      };

      const fixture1 = lxToTaskSystemAdapter(lxResponse);
      const fixture2 = lxToTaskSystemAdapter(lxResponse);

      expect(fixture1.tasks).toHaveLength(1);
      expect(fixture2.tasks).toHaveLength(1);

      const t1 = fixture1.tasks[0];
      const t2 = fixture2.tasks[0];

      expect(typeof t1.pk).toBe("string");
      expect(typeof t1.sk).toBe("string");
      expect(t1.pk.length).toBeGreaterThan(0);
      expect(t1.sk.length).toBeGreaterThan(0);

      // Deterministic across calls for same input (so imports update instead of re-creating)
      expect(t1.pk).toBe(t2.pk);
      expect(t1.sk).toBe(t2.sk);
    });

    it("should NOT use taskInstanceId to derive pk/sk when pk/sk are missing", () => {
      const baseTask: LXTask = {
        title: "Episodic Task 01",
        taskType: "EPISODIC",
        date: "2026-01-23",
        taskDefinitionId: "TaskDefinition.abc123",
      };

      const response1: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2026-01-23",
              dayOffset: 0,
              tasks: [{ ...baseTask, taskInstanceId: "instance-1" }],
            },
          ],
        },
      };

      const response2: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2026-01-23",
              dayOffset: 0,
              tasks: [{ ...baseTask, taskInstanceId: "instance-2" }],
            },
          ],
        },
      };

      const f1 = lxToTaskSystemAdapter(response1);
      const f2 = lxToTaskSystemAdapter(response2);

      expect(f1.tasks[0].pk).toBe(f2.tasks[0].pk);
      expect(f1.tasks[0].sk).toBe(f2.tasks[0].sk);
    });
  });

  describe("actions transformation", () => {
    it("should convert actions array to JSON string", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        actions: [
          {
            entityId:
              "ActivityRef#Arm.11111111-1111-1111-1111-111111111111#ActivityGroup.22222222-2222-2222-2222-222222222222#Activity.33333333-3333-3333-3333-333333333333",
            entityType: "ACTIVITY",
            ref: {
              activityId: "Activity.33333333-3333-3333-3333-333333333333",
              hashKey: "hash-789",
            },
          },
        ],
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(typeof task.actions).toBe("string");
      expect(task.actions).toBeTruthy();
      const parsedActions = JSON.parse(task.actions!);
      expect(parsedActions).toHaveLength(1);
      expect(parsedActions[0].entityId).toBe(
        "ActivityRef#Arm.11111111-1111-1111-1111-111111111111#ActivityGroup.22222222-2222-2222-2222-222222222222#Activity.33333333-3333-3333-3333-333333333333"
      );
    });

    it("should extract entityId from actions[0].entityId", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        actions: [
          {
            entityId:
              "ActivityRef#Arm.11111111-1111-1111-1111-111111111111#ActivityGroup.22222222-2222-2222-2222-222222222222#Activity.33333333-3333-3333-3333-333333333333",
            entityType: "ACTIVITY",
          },
        ],
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      // Normalizes ActivityRef#... to Activity.<uuid>
      expect(task.entityId).toBe(
        "Activity.33333333-3333-3333-3333-333333333333"
      );
    });

    it("should extract hashKey from actions[0].ref.hashKey", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        actions: [
          {
            entityId: "activity-456",
            entityType: "ACTIVITY",
            ref: {
              hashKey: "hash-789",
            },
          },
        ],
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.hashKey).toBe("hash-789");
    });

    it("should preserve existing hashKey if present", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        hashKey: "existing-hash",
        actions: [
          {
            entityId:
              "ActivityRef#Arm.11111111-1111-1111-1111-111111111111#ActivityGroup.22222222-2222-2222-2222-222222222222#Activity.33333333-3333-3333-3333-333333333333",
            entityType: "ACTIVITY",
            ref: {
              hashKey: "hash-789",
            },
          },
        ],
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.hashKey).toBe("existing-hash");
    });

    it("should handle actions already as JSON string", () => {
      const actionsArray = [
        {
          entityId:
            "ActivityRef#Arm.11111111-1111-1111-1111-111111111111#ActivityGroup.22222222-2222-2222-2222-222222222222#Activity.33333333-3333-3333-3333-333333333333",
          entityType: "ACTIVITY",
          ref: {
            activityId: "Activity.33333333-3333-3333-3333-333333333333",
            hashKey: "hash-789",
          },
        },
      ];

      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        actions: JSON.stringify(actionsArray),
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.actions).toBe(JSON.stringify(actionsArray));
      // Prefer ref.activityId and normalize away ActivityRef#... chains.
      expect(task.entityId).toBe(
        "Activity.33333333-3333-3333-3333-333333333333"
      );
      expect(task.hashKey).toBe("hash-789");
    });

    it("should handle empty actions array", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        actions: [],
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.actions).toBe("[]");
      expect(task.entityId).toBeNull();
    });
  });

  describe("anchors transformation", () => {
    it("should convert anchors array to JSON string", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        anchors: [
          {
            anchorFromId: "event-1",
            anchorFromType: "EVENT",
            dayOffset: 0,
          },
        ],
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(typeof task.anchors).toBe("string");
      expect(task.anchors).toBeTruthy();
      const parsedAnchors = JSON.parse(task.anchors!);
      expect(parsedAnchors).toHaveLength(1);
      expect(parsedAnchors[0].anchorFromId).toBe("event-1");
    });

    it("should handle anchors already as JSON string", () => {
      const anchorsArray = [
        {
          anchorFromId: "event-1",
          anchorFromType: "EVENT",
          dayOffset: 0,
        },
      ];

      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        anchors: JSON.stringify(anchorsArray),
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.anchors).toBe(JSON.stringify(anchorsArray));
    });
  });

  describe("timestamp conversion", () => {
    it("should convert startTime to startTimeInMillSec", () => {
      const startTime = "2025-01-20T10:00:00.000Z";
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        startTime,
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.startTime).toBe(startTime);
      expect(task.startTimeInMillSec).toBe(new Date(startTime).getTime());
    });

    it("should convert endTime to endTimeInMillSec", () => {
      const endTime = "2025-01-20T11:00:00.000Z";
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        endTime,
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.endTime).toBe(endTime);
      expect(task.endTimeInMillSec).toBe(new Date(endTime).getTime());
    });

    it("should handle invalid date strings gracefully", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        startTime: "invalid-date",
        endTime: "invalid-date",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.startTime).toBe("invalid-date");
      expect(task.startTimeInMillSec).toBeNull();
      expect(task.endTime).toBe("invalid-date");
      expect(task.endTimeInMillSec).toBeNull();
    });
  });

  describe("tci field extraction", () => {
    it("should extract tciSk from tci object", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        tci: {
          pk: "tci-pk",
          sk: "tci-sk-456",
          rescheduled: 0,
          canMoveSeriesWithVisit: true,
        },
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.tciSk).toBe("tci-sk-456");
    });

    it("should handle missing tci object", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.tciSk).toBeNull();
    });
  });

  describe("task type normalization", () => {
    it("should normalize SCHEDULED task type", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks[0].taskType).toBe(TaskType.SCHEDULED);
    });

    it("should normalize TIMED task type", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "TIMED",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks[0].taskType).toBe(TaskType.TIMED);
    });

    it("should normalize EPISODIC task type", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "EPISODIC",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks[0].taskType).toBe(TaskType.EPISODIC);
    });

    it("should handle case-insensitive task types", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "scheduled",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks[0].taskType).toBe(TaskType.SCHEDULED);
    });

    it("should default to SCHEDULED for unknown task types", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "UNKNOWN_TYPE",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks[0].taskType).toBe(TaskType.SCHEDULED);
    });
  });

  describe("task status normalization", () => {
    it("should normalize all valid status values", () => {
      const statuses = [
        { lx: "OPEN", expected: TaskStatus.OPEN },
        { lx: "VISIBLE", expected: TaskStatus.VISIBLE },
        { lx: "STARTED", expected: TaskStatus.STARTED },
        { lx: "INPROGRESS", expected: TaskStatus.INPROGRESS },
        { lx: "COMPLETED", expected: TaskStatus.COMPLETED },
        { lx: "EXPIRED", expected: TaskStatus.EXPIRED },
        { lx: "RECALLED", expected: TaskStatus.RECALLED },
      ];

      statuses.forEach(({ lx, expected }) => {
        const lxTask: LXTask = {
          pk: "task-123",
          sk: "sk-123",
          title: "Test Task",
          taskType: "SCHEDULED",
          status: lx,
        };

        const lxResponse: LXGetTasksResponse = {
          data: {
            getTasks: [
              {
                date: "2025-01-20",
                dayOffset: 0,
                tasks: [lxTask],
              },
            ],
          },
        };

        const fixture = lxToTaskSystemAdapter(lxResponse);
        expect(fixture.tasks[0].status).toBe(expected);
      });
    });

    it("should handle case-insensitive status values", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        status: "completed",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks[0].status).toBe(TaskStatus.COMPLETED);
    });

    it("should default to OPEN for missing status", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks[0].status).toBe(TaskStatus.OPEN);
    });

    it("should default to OPEN for unknown status", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        status: "UNKNOWN_STATUS",
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks[0].status).toBe(TaskStatus.OPEN);
    });
  });

  describe("multiple tasks and dates", () => {
    it("should flatten tasks from multiple dates", () => {
      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [
                {
                  pk: "task-1",
                  sk: "sk-1",
                  title: "Task 1",
                  taskType: "SCHEDULED",
                },
                {
                  pk: "task-2",
                  sk: "sk-2",
                  title: "Task 2",
                  taskType: "SCHEDULED",
                },
              ],
            },
            {
              date: "2025-01-21",
              dayOffset: 1,
              tasks: [
                {
                  pk: "task-3",
                  sk: "sk-3",
                  title: "Task 3",
                  taskType: "SCHEDULED",
                },
              ],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);

      expect(fixture.tasks).toHaveLength(3);
      expect(fixture.tasks[0].pk).toBe("task-1");
      expect(fixture.tasks[1].pk).toBe("task-2");
      expect(fixture.tasks[2].pk).toBe("task-3");
    });

    it("should handle empty task arrays", () => {
      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      expect(fixture.tasks).toHaveLength(0);
    });
  });

  describe("LX-specific fields preservation", () => {
    it("should preserve all LX-specific fields", () => {
      const lxTask: LXTask = {
        pk: "task-123",
        sk: "sk-123",
        title: "Test Task",
        taskType: "SCHEDULED",
        description: "Task description",
        taskInstanceId: "instance-456",
        dayOffset: 5,
        endDayOffset: 10,
        showBeforeStart: true,
        allowEarlyCompletion: true,
        allowLateCompletion: false,
        allowLateEdits: true,
        anchorDayOffset: 2,
        hashKey: "hash-789",
        occurrenceHashKey: "occ-hash-123",
        occurrenceParentHashKey: "parent-hash-456",
        parentTaskInstanceId: "parent-instance-789",
        activityAnswer: '{"answer": "test"}',
        activityResponse: '{"response": "test"}',
      };

      const lxResponse: LXGetTasksResponse = {
        data: {
          getTasks: [
            {
              date: "2025-01-20",
              dayOffset: 0,
              tasks: [lxTask],
            },
          ],
        },
      };

      const fixture = lxToTaskSystemAdapter(lxResponse);
      const task = fixture.tasks[0];

      expect(task.description).toBe("Task description");
      expect(task.taskInstanceId).toBe("instance-456");
      expect(task.dayOffset).toBe(5);
      expect(task.endDayOffset).toBe(10);
      expect(task.showBeforeStart).toBe(true);
      expect(task.allowEarlyCompletion).toBe(true);
      expect(task.allowLateCompletion).toBe(false);
      expect(task.allowLateEdits).toBe(true);
      expect(task.anchorDayOffset).toBe(2);
      expect(task.hashKey).toBe("hash-789");
      expect(task.occurrenceHashKey).toBe("occ-hash-123");
      expect(task.occurrenceParentHashKey).toBe("parent-hash-456");
      expect(task.parentTaskInstanceId).toBe("parent-instance-789");
      expect(task.activityAnswer).toBe('{"answer": "test"}');
      expect(task.activityResponse).toBe('{"response": "test"}');
    });
  });
});
