/**
 * Zod validation schemas for Task service layer.
 *
 * Provides input validation for all Task CRUD operations to ensure
 * data integrity and prevent invalid data from reaching the DataStore.
 *
 * @module taskSchemas
 */

import { z } from "zod";
import { TaskType, TaskStatus } from "@task-types/Task";

/**
 * Schema for Task creation input validation.
 *
 * Validates required fields and data types for creating new tasks.
 */
export const createTaskSchema = z
  .object({
    pk: z.string().min(1, "pk is required"),
    sk: z.string().min(1, "sk is required"),
    title: z.string().min(1, "Title is required").max(500, "Title too long"),
    description: z
      .string()
      .max(2000, "Description too long")
      .optional()
      .nullable(),
    taskType: z.nativeEnum(TaskType, {
      message: "Invalid task type",
    }),
    status: z.nativeEnum(TaskStatus, {
      message: "Invalid task status",
    }),
    startTimeInMillSec: z.number().int().positive().optional().nullable(),
    // expireTimeInMillSec: 0 is allowed for episodic tasks
    expireTimeInMillSec: z.number().int().nonnegative().optional().nullable(),
    endTimeInMillSec: z.number().int().positive().optional().nullable(),
    entityId: z.string().optional().nullable(),
    taskInstanceId: z.string().optional().nullable(),
    activityIndex: z.number().int().nonnegative().optional().nullable(),
    dayOffset: z.number().int().optional().nullable(),
    endDayOffset: z.number().int().optional().nullable(),
    anchorDayOffset: z.number().int().optional().nullable(),
    showBeforeStart: z.boolean().optional().nullable(),
    allowEarlyCompletion: z.boolean().optional().nullable(),
    allowLateCompletion: z.boolean().optional().nullable(),
    allowLateEdits: z.boolean().optional().nullable(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    anchors: z.string().optional().nullable(),
    actions: z.string().optional().nullable(),
    activityAnswer: z.string().optional().nullable(),
    resultInstanceId: z.string().optional().nullable(),
    metaInfo: z.string().optional().nullable(),
    version: z.number().int().nonnegative().optional().nullable(),
  })
  .refine(
    data => {
      // For non-episodic tasks, expireTimeInMillSec must be > 0 if provided
      if (
        data.expireTimeInMillSec !== null &&
        data.expireTimeInMillSec !== undefined &&
        data.taskType !== TaskType.EPISODIC &&
        data.expireTimeInMillSec <= 0
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "expireTimeInMillSec must be greater than 0 for non-episodic tasks",
      path: ["expireTimeInMillSec"],
    }
  )
  .refine(
    data => {
      // Validate time ranges if both start and expire are provided
      if (data.startTimeInMillSec && data.expireTimeInMillSec) {
        return data.expireTimeInMillSec >= data.startTimeInMillSec;
      }
      return true;
    },
    {
      message: "Expire time must be after start time",
      path: ["expireTimeInMillSec"],
    }
  )
  .refine(
    data => {
      // Validate end time is after expire time if both provided
      if (data.expireTimeInMillSec && data.endTimeInMillSec) {
        return data.endTimeInMillSec >= data.expireTimeInMillSec;
      }
      return true;
    },
    {
      message: "End time must be after expire time",
      path: ["endTimeInMillSec"],
    }
  );

/**
 * Schema for Task update input validation.
 *
 * All fields are optional since updates are partial.
 * Validates data types for any provided fields.
 */
export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title cannot be empty")
      .max(500, "Title too long")
      .optional(),
    description: z
      .string()
      .max(2000, "Description too long")
      .optional()
      .nullable(),
    status: z
      .nativeEnum(TaskStatus, {
        message: "Invalid task status",
      })
      .optional(),
    taskType: z
      .nativeEnum(TaskType, {
        message: "Invalid task type",
      })
      .optional(),
    startTimeInMillSec: z.number().int().positive().optional().nullable(),
    // expireTimeInMillSec: 0 is allowed for episodic tasks
    expireTimeInMillSec: z.number().int().nonnegative().optional().nullable(),
    endTimeInMillSec: z.number().int().positive().optional().nullable(),
    entityId: z.string().optional().nullable(),
    taskInstanceId: z.string().optional().nullable(),
    activityIndex: z.number().int().nonnegative().optional().nullable(),
    dayOffset: z.number().int().optional().nullable(),
    endDayOffset: z.number().int().optional().nullable(),
    anchorDayOffset: z.number().int().optional().nullable(),
    showBeforeStart: z.boolean().optional().nullable(),
    allowEarlyCompletion: z.boolean().optional().nullable(),
    allowLateCompletion: z.boolean().optional().nullable(),
    allowLateEdits: z.boolean().optional().nullable(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    anchors: z.string().optional().nullable(),
    actions: z.string().optional().nullable(),
    activityAnswer: z.string().optional().nullable(),
    resultInstanceId: z.string().optional().nullable(),
    metaInfo: z.string().optional().nullable(),
    version: z.number().int().nonnegative().optional().nullable(),
  })
  .refine(
    data => {
      // For non-episodic tasks, expireTimeInMillSec must be > 0 if provided
      if (
        data.expireTimeInMillSec !== null &&
        data.expireTimeInMillSec !== undefined &&
        data.taskType !== undefined &&
        data.taskType !== TaskType.EPISODIC &&
        data.expireTimeInMillSec <= 0
      ) {
        return false;
      }
      return true;
    },
    {
      message:
        "expireTimeInMillSec must be greater than 0 for non-episodic tasks",
      path: ["expireTimeInMillSec"],
    }
  )
  .refine(data => Object.keys(data).length > 0, {
    message: "Update must include at least one field",
  });

/**
 * Schema for Task ID validation.
 *
 * Ensures task IDs are valid UUID format.
 */
export const taskIdSchema = z.string().uuid("Invalid task ID format");

/**
 * Schema for Task filters validation.
 *
 * Validates filter parameters for task queries.
 */
export const taskFiltersSchema = z
  .object({
    status: z.array(z.nativeEnum(TaskStatus)).optional(),
    taskType: z.array(z.nativeEnum(TaskType)).optional(),
    searchText: z.string().max(500).optional(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
  })
  .refine(
    data => {
      // Validate date range if both provided
      if (data.dateFrom && data.dateTo) {
        return data.dateTo >= data.dateFrom;
      }
      return true;
    },
    {
      message: "dateTo must be after or equal to dateFrom",
      path: ["dateTo"],
    }
  );

/**
 * Validation error class for schema validation failures.
 */
export class ValidationError extends Error {
  public readonly issues: Array<{ path: string; message: string }>;

  constructor(
    message: string,
    issues: Array<{ path: string; message: string }>
  ) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

/**
 * Helper to validate data against a schema and throw ValidationError if invalid.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param context - Context string for error messages
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues.map((err: any) => ({
      path: err.path.join("."),
      message: err.message,
    }));

    throw new ValidationError(
      `${context} validation failed: ${issues.map((i: { path: string; message: string }, _idx: number) => `${i.path}: ${i.message}`).join(", ")}`,
      issues
    );
  }

  return result.data;
}
