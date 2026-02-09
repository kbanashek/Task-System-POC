import { DataStore } from "@aws-amplify/datastore";
import type { PersistentModelConstructor } from "@aws-amplify/datastore";
import {
  ImportTaskSystemFixtureOptions,
  ImportTaskSystemFixtureResult,
  TaskSystemFixture,
} from "@fixtures/TaskSystemFixture";
import {
  Activity,
  DataPoint,
  DataPointInstance,
  Question,
  Task,
  TaskAnswer,
  TaskHistory,
  TaskResult,
} from "@models/index";
import { ActivityService } from "@services/ActivityService";
import { AppointmentService } from "@services/AppointmentService";
import { QuestionService } from "@services/QuestionService";
import { TaskService } from "@services/TaskService";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import { waitForDataStoreInitialSync } from "@utils/datastore/dataStoreHub";

const logger = getServiceLogger("FixtureImportService");

/**
 * Applies defined values from source to target object, optionally omitting specified keys.
 *
 * @param target - Object to apply values to
 * @param source - Object to copy values from
 * @param omitKeys - Keys to skip during copy
 */
function applyDefined(
  target: unknown,
  source: unknown,
  omitKeys: string[] = []
): void {
  Object.keys((source as Record<string, unknown>) || {}).forEach(key => {
    if (omitKeys.includes(key)) return;
    const value = (source as Record<string, unknown>)[key];
    if (value !== undefined) {
      (target as Record<string, unknown>)[key] = value;
    }
  });
}

/**
 * Service for importing TaskSystemFixture data into AWS DataStore.
 *
 * Handles bulk import of activities, questions, tasks, and related entities
 * from a structured fixture format. Supports updating existing records
 * and pruning non-fixture data.
 *
 * @example
 * ```typescript
 * import { TaskSystemFixture } from "@fixtures/TaskSystemFixture";
 *
 * const fixture: TaskSystemFixture = {
 *   version: 1,
 *   activities: [...],
 *   tasks: [...],
 *   questions: [...],
 * };
 *
 * const result = await FixtureImportService.importTaskSystemFixture(fixture, {
 *   updateExisting: true,
 *   pruneNonFixture: false,
 * });
 *
 * console.log(`Imported ${result.activitiesCreated} activities`);
 * ```
 */
/** Service for importing TaskSystemFixture data into DataStore. */
export class FixtureImportService {
  /** Import a TaskSystemFixture into DataStore. */
  static async importTaskSystemFixture(
    fixture: TaskSystemFixture,
    options: ImportTaskSystemFixtureOptions = {}
  ): Promise<ImportTaskSystemFixtureResult> {
    const appointmentCount = fixture?.appointments
      ? Array.isArray(fixture.appointments)
        ? fixture.appointments.length
        : Object.keys(fixture.appointments).length
      : 0;

    logger.info(
      "importTaskSystemFixture called",
      {
        fixtureVersion: fixture?.version,
        taskCount: fixture?.tasks?.length ?? 0,
        activityCount: fixture?.activities?.length ?? 0,
        questionCount: fixture?.questions?.length ?? 0,
        appointmentCount,
        fixtureId: fixture?.fixtureId,
        options: {
          updateExisting: options.updateExisting ?? true,
          pruneNonFixture: options.pruneNonFixture ?? false,
          pruneDerivedModels: options.pruneDerivedModels ?? false,
        },
      },
      "ENTRY",
      "📋"
    );

    const updateExisting = options.updateExisting ?? true;
    const pruneNonFixture = options.pruneNonFixture ?? false;
    const pruneDerivedModels = options.pruneDerivedModels ?? false;

    if (!fixture || fixture.version !== 1) {
      const error = new Error(
        `Unsupported fixture version: ${String(fixture?.version)}. Expected 1.`
      );
      logger.error("Unsupported fixture version", error, "VALIDATION");
      throw error;
    }

    logger.info(
      "Fixture validation passed",
      { version: fixture.version },
      "STEP-1",
      "✅"
    );

    // CRITICAL: Wait for DataStore's initial sync to complete before querying existing records
    // If we don't wait, we'll query an empty local store and create duplicates when cloud sync finishes
    logger.info(
      "Waiting for DataStore initial sync to complete",
      {},
      "STEP-1.5",
      "⏳"
    );

    try {
      const { Hub } = await import("@aws-amplify/core");
      const result = await waitForDataStoreInitialSync(Hub, {
        timeoutMs: 15000,
      });

      if (result.outcome === "ready") {
        logger.info(
          "DataStore initial sync completed - ready to query existing records",
          { event: result.event },
          "STEP-1.5",
          "✅"
        );
      } else if (result.outcome === "failed") {
        logger.warn(
          "DataStore sync failed - proceeding with import anyway",
          { event: result.event },
          "STEP-1.5",
          "⚠️"
        );
      } else {
        logger.info(
          "DataStore sync timeout (15s) - proceeding with import",
          {},
          "STEP-1.5",
          "⚠️"
        );
      }
    } catch (error) {
      // If waiting fails, log and continue
      logger.warn(
        "Failed to wait for DataStore sync - proceeding anyway",
        error,
        "STEP-1.5",
        "⚠️"
      );
    }

    /**
     * Helper to select the latest item from an array based on _lastChangedAt timestamp.
     * DataStore models have _lastChangedAt at runtime, so this helper accepts any array
     * and adds the timestamp property to the constraint.
     */
    const selectLatestByLastChanged = <T>(items: T[]): T => {
      return [...items].sort((a, b) => {
        const aTime = (a as { _lastChangedAt?: number })._lastChangedAt ?? 0;
        const bTime = (b as { _lastChangedAt?: number })._lastChangedAt ?? 0;
        return bTime - aTime;
      })[0];
    };

    const groupByPk = <T extends { pk: string }>(
      items: T[]
    ): Map<string, T[]> => {
      const map = new Map<string, T[]>();
      items.forEach(item => {
        const existing = map.get(item.pk) ?? [];
        existing.push(item);
        map.set(item.pk, existing);
      });
      return map;
    };

    // Build pk+sk maps for idempotent upserts.
    // Note: Activities can have the same pk but different sk values (e.g., all activities in a study share the same pk)
    // We need to match by both pk AND sk to correctly identify existing activities
    logger.info(
      "Querying existing DataStore records",
      undefined,
      "STEP-2",
      "🔍"
    );

    let existingActivities: Activity[];
    let existingTasks: Task[];
    let existingQuestions: Question[];

    try {
      existingActivities = await DataStore.query(Activity);
      logger.info(
        "Queried existing activities",
        { count: existingActivities.length },
        "STEP-2.1",
        "✅"
      );
    } catch (err) {
      logger.error("Failed to query existing activities", err, "STEP-2.1");
      throw err;
    }

    const activityByPkSk = new Map<string, Activity>(); // Key: `${pk}#${sk}`
    const duplicateActivities: Activity[] = [];

    existingActivities.forEach((activity: Activity) => {
      const key = `${activity.pk}#${activity.sk}`;
      const existing = activityByPkSk.get(key);
      if (!existing) {
        activityByPkSk.set(key, activity);
      } else {
        // If duplicate found, keep the latest one
        const keep = selectLatestByLastChanged([existing, activity]);
        activityByPkSk.set(key, keep);
        duplicateActivities.push(keep === existing ? activity : existing);
      }
    });

    try {
      existingTasks = await DataStore.query(Task);
      logger.info(
        "Queried existing tasks",
        { count: existingTasks.length },
        "STEP-2.2",
        "✅"
      );
    } catch (err) {
      logger.error("Failed to query existing tasks", err, "STEP-2.2");
      throw err;
    }

    const tasksByPkList = groupByPk(existingTasks as Task[]);
    const duplicateTasks: Task[] = [];
    // Map type must match DataStore query return type
    const taskByPk = new Map<string, (typeof existingTasks)[0]>();
    tasksByPkList.forEach((items, pk) => {
      if (items.length === 1) {
        taskByPk.set(pk, items[0]);
        return;
      }
      const keep = selectLatestByLastChanged(items);
      taskByPk.set(pk, keep);
      duplicateTasks.push(...items.filter(i => i !== keep));
    });

    if (duplicateTasks.length > 0) {
      logger.warn(
        "Found duplicate tasks",
        { duplicateCount: duplicateTasks.length },
        "STEP-2.2",
        "⚠️"
      );
    }

    try {
      existingQuestions = await DataStore.query(Question);
      logger.info(
        "Queried existing questions",
        { count: existingQuestions.length },
        "STEP-2.3",
        "✅"
      );
    } catch (err) {
      logger.error("Failed to query existing questions", err, "STEP-2.3");
      throw err;
    }

    const questionsByPkList = groupByPk(existingQuestions as Question[]);
    const duplicateQuestions: Question[] = [];
    const questionByPk = new Map<string, Question>();
    questionsByPkList.forEach((items, pk) => {
      if (items.length === 1) {
        questionByPk.set(pk, items[0]);
        return;
      }
      const keep = selectLatestByLastChanged(items);
      questionByPk.set(pk, keep);
      duplicateQuestions.push(...items.filter(i => i !== keep));
    });

    if (duplicateQuestions.length > 0) {
      logger.warn(
        "Found duplicate questions",
        { duplicateCount: duplicateQuestions.length },
        "STEP-2.3",
        "⚠️"
      );
    }

    logger.info(
      "Finished querying existing records",
      {
        activities: existingActivities.length,
        tasks: existingTasks.length,
        questions: existingQuestions.length,
        duplicateActivities: duplicateActivities.length,
        duplicateTasks: duplicateTasks.length,
        duplicateQuestions: duplicateQuestions.length,
      },
      "STEP-2",
      "✅"
    );

    const result: ImportTaskSystemFixtureResult = {
      activities: { created: 0, updated: 0, skipped: 0 },
      tasks: { created: 0, updated: 0, skipped: 0 },
      questions: { created: 0, updated: 0, skipped: 0 },
      appointments: { saved: false },
    };

    // Activities
    logger.info(
      "Starting activity import",
      {
        fixtureActivityCount: fixture.activities?.length ?? 0,
        updateExisting,
      },
      "STEP-3",
      "📋"
    );

    for (const activityInput of fixture.activities || []) {
      const key = `${activityInput.pk}#${activityInput.sk}`;
      const existing = activityByPkSk.get(key);
      if (!existing) {
        try {
          const created = await ActivityService.createActivity(activityInput);
          activityByPkSk.set(key, created);
          result.activities.created++;
        } catch (err) {
          logger.error(
            `Failed to create activity ${activityInput.pk}`,
            err,
            "STEP-3"
          );
          throw err;
        }
        continue;
      }

      if (!updateExisting) {
        result.activities.skipped++;
        continue;
      }

      try {
        const updated = await DataStore.save(
          Activity.copyOf(existing, draft => {
            // pk/sk are immutable identifiers; do not change them.
            applyDefined(draft, activityInput, ["pk", "sk", "id"]);
          })
        );

        activityByPkSk.set(key, updated);
        result.activities.updated++;
      } catch (err) {
        logger.error(
          `Failed to update activity ${activityInput.pk}`,
          err,
          "STEP-3"
        );
        throw err;
      }
    }

    logger.info(
      "Activity import completed",
      {
        created: result.activities.created,
        updated: result.activities.updated,
        skipped: result.activities.skipped,
      },
      "STEP-3",
      "✅"
    );

    // Questions (optional)
    logger.info(
      "Starting question import",
      {
        fixtureQuestionCount: fixture.questions?.length ?? 0,
        updateExisting,
      },
      "STEP-4",
      "📋"
    );

    for (const questionInput of fixture.questions || []) {
      const existing = questionByPk.get(questionInput.pk);
      if (!existing) {
        try {
          const created = await QuestionService.createQuestion(questionInput);
          questionByPk.set(created.pk, created);
          result.questions.created++;
        } catch (err) {
          logger.error(
            `Failed to create question ${questionInput.pk}`,
            err,
            "STEP-4"
          );
          throw err;
        }
        continue;
      }

      if (!updateExisting) {
        result.questions.skipped++;
        continue;
      }

      try {
        const updated = await DataStore.save(
          Question.copyOf(existing, draft => {
            applyDefined(draft, questionInput, ["pk", "sk", "id"]);
          })
        );

        questionByPk.set(updated.pk, updated);
        result.questions.updated++;
      } catch (err) {
        logger.error(
          `Failed to update question ${questionInput.pk}`,
          err,
          "STEP-4"
        );
        throw err;
      }
    }

    logger.info(
      "Question import completed",
      {
        created: result.questions.created,
        updated: result.questions.updated,
        skipped: result.questions.skipped,
      },
      "STEP-4",
      "✅"
    );

    // Tasks
    logger.info(
      "Starting task import",
      {
        fixtureTaskCount: fixture.tasks?.length ?? 0,
        updateExisting,
      },
      "STEP-5",
      "📋"
    );

    for (const taskInput of fixture.tasks || []) {
      const existing = taskByPk.get(taskInput.pk);
      if (!existing) {
        try {
          const created = await TaskService.createTask(taskInput);
          // Cast to DataStore type to match map values from DataStore.query
          taskByPk.set(created.pk, created as (typeof existingTasks)[0]);
          result.tasks.created++;
        } catch (err) {
          logger.error(`Failed to create task ${taskInput.pk}`, err, "STEP-5");
          throw err;
        }
        continue;
      }

      if (!updateExisting) {
        result.tasks.skipped++;
        continue;
      }

      try {
        const updated = await DataStore.save(
          Task.copyOf(existing, draft => {
            // Preserve user state fields - only update structural fixture data
            // DO NOT overwrite: status, startTimeInMillSec, taskInstanceId, parentTaskInstanceId
            // These represent user progress and should persist across fixture updates
            applyDefined(draft, taskInput, [
              "pk",
              "sk",
              "id",
              "status",
              "startTimeInMillSec",
              "taskInstanceId",
              "parentTaskInstanceId",
            ]);
          })
        );

        taskByPk.set(updated.pk, updated);
        result.tasks.updated++;
      } catch (err) {
        logger.error(`Failed to update task ${taskInput.pk}`, err, "STEP-5");
        throw err;
      }
    }

    logger.info(
      "Task import completed",
      {
        created: result.tasks.created,
        updated: result.tasks.updated,
        skipped: result.tasks.skipped,
      },
      "STEP-5",
      "✅"
    );

    // Appointments (optional; stored in AsyncStorage)
    if (fixture.appointments) {
      const appointmentCount = Array.isArray(fixture.appointments)
        ? fixture.appointments.length
        : Object.keys(fixture.appointments).length;
      logger.info(
        "Saving appointments",
        {
          appointmentCount,
        },
        "STEP-6",
        "📅"
      );
      try {
        await AppointmentService.saveAppointments(fixture.appointments);
        result.appointments.saved = true;
        logger.info(
          "Appointments saved",
          { count: appointmentCount },
          "STEP-6",
          "✅"
        );
      } catch (err) {
        logger.error("Failed to save appointments", err, "STEP-6");
        throw err;
      }
    }

    // Optional: prune non-fixture records so fixture is the authoritative dataset.
    if (pruneNonFixture) {
      logger.info(
        "Starting prune operation",
        {
          pruneDerivedModels,
        },
        "STEP-7",
        "🗑️"
      );
      const fixtureActivityPks = new Set(
        (fixture.activities || []).map(a => a.pk)
      );
      const fixtureTaskPks = new Set((fixture.tasks || []).map(t => t.pk));
      const fixtureQuestionPks = new Set(
        (fixture.questions || []).map(q => q.pk)
      );

      const activitiesToDelete = existingActivities.filter(
        a => !fixtureActivityPks.has(a.pk)
      );
      const tasksToDelete = existingTasks.filter(
        t => !fixtureTaskPks.has(t.pk)
      );
      const questionsToDelete = existingQuestions.filter(
        q => !fixtureQuestionPks.has(q.pk)
      );

      // Best-effort deletes: these will be synced to cloud by DataStore.
      // We prune only core content models (Task/Activity/Question) to avoid
      // deleting submitted answer/result/history data unintentionally.
      const coreDeletes = [
        // Dedupe by pk (pk is not the Dynamo primary key, so duplicates can exist in cloud)
        ...duplicateActivities.map(a => DataStore.delete(a)),
        ...duplicateTasks.map(t => DataStore.delete(t)),
        ...duplicateQuestions.map(q => DataStore.delete(q)),
        ...activitiesToDelete.map(a => DataStore.delete(a)),
        ...tasksToDelete.map(t => DataStore.delete(t)),
        ...questionsToDelete.map(q => DataStore.delete(q)),
      ];

      logger.info(
        "Executing core deletes",
        {
          deleteCount: coreDeletes.length,
          duplicateActivities: duplicateActivities.length,
          duplicateTasks: duplicateTasks.length,
          duplicateQuestions: duplicateQuestions.length,
          activitiesToDelete: activitiesToDelete.length,
          tasksToDelete: tasksToDelete.length,
          questionsToDelete: questionsToDelete.length,
        },
        "STEP-7.1",
        "🗑️"
      );

      try {
        await Promise.all(coreDeletes);
        logger.info(
          "Core deletes completed",
          { deletedCount: coreDeletes.length },
          "STEP-7.1",
          "✅"
        );
      } catch (err) {
        logger.error("Failed to execute core deletes", err, "STEP-7.1");
        throw err;
      }

      // Optional: also prune derived models for dev/test reseeds.
      // This is intentionally behind a flag to avoid deleting real user data in production flows.
      if (pruneDerivedModels) {
        logger.info(
          "Starting derived model pruning",
          undefined,
          "STEP-7.2",
          "🗑️"
        );

        const deleteAll = async <TModel extends { id: string }>(
          model: PersistentModelConstructor<TModel>,
          modelName: string
        ): Promise<void> => {
          const items = await DataStore.query(model);
          logger.info(
            `Deleting ${modelName}`,
            { count: items.length },
            "STEP-7.2",
            "🗑️"
          );
          await Promise.all(items.map(item => DataStore.delete(item)));
        };

        try {
          await Promise.all([
            deleteAll(TaskAnswer, "TaskAnswer"),
            deleteAll(TaskResult, "TaskResult"),
            deleteAll(TaskHistory, "TaskHistory"),
            deleteAll(DataPointInstance, "DataPointInstance"),
            deleteAll(DataPoint, "DataPoint"),
          ]);
          logger.info(
            "Derived model pruning completed",
            undefined,
            "STEP-7.2",
            "✅"
          );
        } catch (err) {
          logger.error("Failed to prune derived models", err, "STEP-7.2");
          throw err;
        }
      }

      logger.info(
        "Prune operation completed",
        {
          pruneDerivedModels,
        },
        "STEP-7",
        "✅"
      );
    }

    logger.info(
      "Fixture import completed successfully",
      {
        activities: {
          created: result.activities.created,
          updated: result.activities.updated,
          skipped: result.activities.skipped,
        },
        tasks: {
          created: result.tasks.created,
          updated: result.tasks.updated,
          skipped: result.tasks.skipped,
        },
        questions: {
          created: result.questions.created,
          updated: result.questions.updated,
          skipped: result.questions.skipped,
        },
        appointments: {
          saved: result.appointments.saved,
        },
        totalImported:
          result.activities.created +
          result.activities.updated +
          result.tasks.created +
          result.tasks.updated +
          result.questions.created +
          result.questions.updated,
      },
      "SUCCESS",
      "✅"
    );

    return result;
  }
}
