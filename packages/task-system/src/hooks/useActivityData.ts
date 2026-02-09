import { useActivity } from "@hooks/useActivity";
import { useTaskAnswer } from "@hooks/useTaskAnswer";
import { TaskService } from "@services/TaskService";
import type { Activity } from "@task-types/Activity";
import { ActivityConfig } from "@task-types/ActivityConfig";
import type { AnswerValue } from "@task-types/AnswerValue";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import {
  ParsedActivityData,
  parseActivityConfig,
} from "@utils/parsers/activityParser";
import { DataStore } from "aws-amplify/datastore";
import { useEffect, useRef, useState } from "react";
import { TaskTempAnswer } from "../models";

const logger = getServiceLogger("useActivityData");

/**
 * Interface representing a map of question IDs to answer values.
 * Answer values can be strings, numbers, booleans, arrays, or objects as defined by AnswerValue.
 */
interface AnswersMap {
  [key: string]: AnswerValue;
}

/**
 * Return type for the useActivityData hook.
 */
export interface UseActivityDataReturn {
  loading: boolean;
  error: string | null;
  activity: Activity | null;
  activityData: ParsedActivityData | null;
  activityConfig: ActivityConfig | null;
  initialAnswers: AnswersMap;
}

/**
 * Options for the useActivityData hook.
 */
export interface UseActivityDataOptions {
  entityId: string | undefined;
  taskId: string | undefined;
}

/**
 * Hook for fetching and parsing activity data
 * Handles activity loading, config parsing, and initial answer loading
 */
export const useActivityData = ({
  entityId,
  taskId,
}: UseActivityDataOptions): UseActivityDataReturn => {
  const {
    activity,
    loading: activityLoading,
    error: activityError,
  } = useActivity(entityId || null);
  const { taskAnswers, getAnswersByTaskId } = useTaskAnswer();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<ParsedActivityData | null>(
    null
  );
  const [activityConfig, setActivityConfig] = useState<ActivityConfig | null>(
    null
  );
  const [initialAnswers, setInitialAnswers] = useState<AnswersMap>({});

  // Use ref to avoid recreating subscription when taskAnswers changes
  const taskAnswersRef = useRef(taskAnswers);
  taskAnswersRef.current = taskAnswers;
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      // Wait for activity to load
      if (activityLoading) {
        return;
      }
      // If entityId is missing but a taskId exists, defer erroring and wait for
      // a task-derived entityId (some hosts provide the entityId via task later).
      if (!entityId) {
        if (taskId) {
          // Defer - don't hard-error; wait for task-derived fallback
          return;
        }
        setError(
          "This task does not have an associated activity. Please ensure the task has an entityId that links to an Activity."
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (!activity) {
          if (activityError) {
            setError(activityError);
          } else {
            setError(`Activity not found: ${entityId}`);
          }
          setLoading(false);
          return;
        }

        // Reconstruct the full JSON structure matching the provided format
        const parsedConfig: ActivityConfig = {};

        // Parse layouts - check if it contains the full JSON structure
        if (activity.layouts) {
          try {
            const parsedLayouts = JSON.parse(activity.layouts);

            // Check if this is the full JSON structure
            if (
              typeof parsedLayouts === "object" &&
              !Array.isArray(parsedLayouts) &&
              (parsedLayouts.activityGroups ||
                parsedLayouts.introductionScreen ||
                parsedLayouts.summaryScreen ||
                parsedLayouts.completionScreen)
            ) {
              // Full JSON structure - extract all parts
              parsedConfig.activityGroups = parsedLayouts.activityGroups;
              parsedConfig.layouts = parsedLayouts.layouts || [];
              parsedConfig.introductionScreen =
                parsedLayouts.introductionScreen;
              parsedConfig.summaryScreen = parsedLayouts.summaryScreen;
              parsedConfig.completionScreen = parsedLayouts.completionScreen;
            } else if (Array.isArray(parsedLayouts)) {
              parsedConfig.layouts = parsedLayouts;
            } else {
              parsedConfig.layouts = parsedLayouts;
            }
          } catch (e) {
            try {
              logger.error("Error parsing layouts", e, "ActivityConfig", "❌");
            } catch (logErr) {}
          }
        }

        // Parse activityGroups (if not already extracted)
        if (!parsedConfig.activityGroups && activity.activityGroups) {
          try {
            parsedConfig.activityGroups = JSON.parse(activity.activityGroups);
          } catch (e) {
            try {
              logger.error(
                "Error parsing activityGroups",
                e,
                "ActivityConfig",
                "❌"
              );
            } catch (logErr) {}
          }
        }

        // Load existing answers from TaskAnswer (final submitted answers)
        const existingAnswers: AnswersMap = {};
        if (taskId) {
          const taskAnswersForTask = getAnswersByTaskId(taskId);
          taskAnswersForTask.forEach(ta => {
            if (ta.questionId && ta.answer) {
              try {
                existingAnswers[ta.questionId] = JSON.parse(ta.answer);
              } catch {
                existingAnswers[ta.questionId] = ta.answer;
              }
            }
          });
        }

        // Don't load temp answers here - the subscription will handle it
        // This avoids race conditions where we load stale data before DataStore syncs

        // Start with just final submitted answers
        const initialMergedAnswers = { ...existingAnswers };

        try {
          logger.info(
            "Setting initialAnswers (temp answers will load via subscription)",
            {
              existingCount: Object.keys(existingAnswers).length,
              mergedCount: Object.keys(initialMergedAnswers).length,
              sampleKeys: Object.keys(initialMergedAnswers).slice(0, 3),
            },
            "InitialLoad",
            "🔄"
          );
        } catch (e) {}

        // Parse activity config
        const parsed = parseActivityConfig(parsedConfig, initialMergedAnswers);
        if (isMountedRef.current) {
          setActivityData(parsed);
          setActivityConfig(parsedConfig);
          setInitialAnswers(initialMergedAnswers);
        }
      } catch (err: unknown) {
        try {
          logger.error("Error fetching activity", err, "ActivityFetch", "❌");
        } catch (e) {}
        if (isMountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to load activity"
          );
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, taskId, activity, activityLoading, activityError]);

  // Subscribe to real-time temp answer updates from DataStore
  useEffect(() => {
    if (!taskId) {
      return;
    }

    const isMountedLocal = { current: true };

    let subscription: { unsubscribe: () => void } | null = null;
    let taskPk: string | null = null;

    const setupSubscription = async () => {
      try {
        const task = await TaskService.getTaskById(taskId);
        if (!task?.pk) {
          return;
        }

        taskPk = task.pk;

        // Track if we've processed the initial load
        let hasProcessedInitialLoad = false;

        // Subscribe to TaskTempAnswer changes for this task
        subscription = DataStore.observeQuery(TaskTempAnswer).subscribe({
          next: async snapshot => {
            const { items, isSynced } = snapshot;

            try {
              logger.info(
                "Subscription fired - RECEIVED FROM DATASTORE",
                {
                  totalItems: items.length,
                  taskPk,
                  isSynced,
                },
                "TaskTempAnswer",
                "🔔"
              );
            } catch (e) {}

            // Process immediately if synced, or if we have items locally
            // This handles offline scenarios where isSynced might stay false
            const shouldProcess =
              isSynced || (items.length > 0 && !hasProcessedInitialLoad);

            if (!shouldProcess) {
              logger.info(
                "Waiting for DataStore sync...",
                {
                  taskPk,
                  itemsBeforeSync: items.length,
                  hasProcessedInitialLoad,
                },
                "TaskTempAnswer",
                "⏳"
              );
              return;
            }

            hasProcessedInitialLoad = true;

            if (!isSynced && items.length > 0) {
              logger.warn(
                "Processing local data (not yet synced)",
                {
                  taskPk,
                  itemsCount: items.length,
                },
                "TaskTempAnswer",
                "⚠️"
              );
            }

            // Filter items for this specific task and sort by localtime descending
            const taskItems = items
              .filter(item => item.taskPk === taskPk)
              .sort((a, b) => {
                const timeA = a.localtime ? new Date(a.localtime).getTime() : 0;
                const timeB = b.localtime ? new Date(b.localtime).getTime() : 0;
                return timeB - timeA; // Descending order (most recent first)
              });

            logger.info(
              "Filtered items for task",
              {
                taskPk,
                filteredCount: taskItems.length,
              },
              "TaskTempAnswer",
              "🔍"
            );

            if (taskItems.length > 0) {
              const latestTempAnswer = taskItems[0];
              logger.info(
                "Latest temp answer found",
                {
                  id: latestTempAnswer.id,
                  taskPk: latestTempAnswer.taskPk,
                  localtime: latestTempAnswer.localtime,
                },
                "TaskTempAnswer",
                "📦"
              );

              // Parse the answers JSON string
              let tempAnswers: AnswersMap = {};
              if (latestTempAnswer.answers) {
                try {
                  if (typeof latestTempAnswer.answers === "string") {
                    try {
                      tempAnswers = JSON.parse(
                        latestTempAnswer.answers
                      ) as AnswersMap;
                    } catch (e) {
                      // Handle double-encoded JSON (string containing JSON string)
                      try {
                        const first = JSON.parse(latestTempAnswer.answers);
                        if (typeof first === "string") {
                          tempAnswers = JSON.parse(first) as AnswersMap;
                        } else {
                          tempAnswers = first as AnswersMap;
                        }
                      } catch (e2) {
                        // Fallback to empty
                        tempAnswers = {};
                      }
                    }
                  } else if (
                    typeof latestTempAnswer.answers === "object" &&
                    latestTempAnswer.answers !== null
                  ) {
                    // Already an object - use as-is
                    tempAnswers = latestTempAnswer.answers as AnswersMap;
                  } else {
                    logger.warn(
                      "Unexpected answers data type in subscription",
                      {
                        type: typeof latestTempAnswer.answers,
                      },
                      "TaskTempAnswer",
                      "⚠️"
                    );
                  }

                  // Log parsed temp answers with actual values
                  const tempKeys = Object.keys(tempAnswers);
                  const tempPreview = tempKeys
                    .slice(0, 3)
                    .map(
                      key =>
                        `${key}=${JSON.stringify(tempAnswers[key]).substring(0, 50)}`
                    )
                    .join(", ");
                  logger.info(
                    "PARSED temp answers from subscription",
                    {
                      tempAnswersCount: tempKeys.length,
                      tempKeys: tempKeys.join(", "),
                      tempPreview,
                    },
                    "TaskTempAnswer",
                    "📝"
                  );
                } catch (error) {
                  try {
                    logger.error(
                      "Error parsing temp answers from subscription",
                      error,
                      "TaskTempAnswer",
                      "❌"
                    );
                    logger.debug(
                      "Temp answer parsing context",
                      {
                        answersPreview:
                          typeof latestTempAnswer.answers === "string"
                            ? latestTempAnswer.answers.substring(0, 100)
                            : String(latestTempAnswer.answers).substring(
                                0,
                                100
                              ),
                      },
                      "TaskTempAnswer",
                      "🔍"
                    );
                  } catch (logErr) {}
                }
              }

              // Load existing TaskAnswers
              // Use ref to get latest taskAnswers without causing subscription recreation
              const existingAnswers: AnswersMap = {};
              const taskAnswersForTask = taskAnswersRef.current.filter(
                ta => ta.taskInstanceId === taskId
              );
              taskAnswersForTask.forEach(ta => {
                if (ta.questionId && ta.answer) {
                  try {
                    existingAnswers[ta.questionId] = JSON.parse(ta.answer);
                  } catch {
                    existingAnswers[ta.questionId] = ta.answer;
                  }
                }
              });

              // Merge: temp answers override existing answers
              const mergedAnswers = { ...existingAnswers, ...tempAnswers };

              const mergedKeys = Object.keys(mergedAnswers);
              const mergedPreview = mergedKeys
                .slice(0, 3)
                .map(
                  key =>
                    `${key}=${JSON.stringify(mergedAnswers[key]).substring(0, 50)}`
                )
                .join(", ");

              logger.info(
                "MERGED answers from DataStore subscription",
                {
                  taskPk,
                  existingCount: Object.keys(existingAnswers).length,
                  tempCount: Object.keys(tempAnswers).length,
                  mergedCount: mergedKeys.length,
                  mergedKeys: mergedKeys.join(", "),
                  mergedPreview,
                  isSynced,
                },
                "Real-time",
                "🔄"
              );

              // Update initialAnswers - this will trigger useEffect in useQuestionsScreen
              if (isMountedLocal.current) setInitialAnswers(mergedAnswers);

              try {
                if (isMountedLocal.current) {
                  logger.info(
                    "setInitialAnswers CALLED - this should trigger useQuestionsScreen",
                    {
                      mergedCount: mergedKeys.length,
                      mergedKeys: mergedKeys.join(", "),
                      willTriggerReRender:
                        "yes - useEffect in useQuestionsScreen should fire",
                    },
                    "Real-time",
                    "✅"
                  );
                }
              } catch (e) {}
            } else {
              logger.info(
                `No temp answers found for task ${taskPk}`,
                {
                  totalItems: items.length,
                  taskItems: taskItems.length,
                },
                "TaskTempAnswer",
                "📭"
              );
            }
          },
          error: err => {
            try {
              logger.error("Subscription error", err, "TaskTempAnswer", "❌");
            } catch (e) {}
          },
        });

        try {
          logger.info(
            "Subscribed to TaskTempAnswer updates",
            { taskPk },
            "Setup",
            "✅"
          );
        } catch (e) {}
      } catch (error) {
        try {
          logger.error(
            "Error setting up TaskTempAnswer subscription",
            error,
            "Setup",
            "❌"
          );
        } catch (e) {}
      }
    };

    setupSubscription();

    return () => {
      isMountedLocal.current = false;
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (e) {}
        try {
          logger.info(
            "Unsubscribed from TaskTempAnswer updates",
            { taskPk },
            "Cleanup",
            "🔌"
          );
        } catch (e) {}
      }
    };
  }, [taskId]); // Only taskId - taskAnswers accessed via ref to prevent subscription recreation

  return {
    loading,
    error,
    activity,
    activityData,
    activityConfig,
    initialAnswers,
  };
};
