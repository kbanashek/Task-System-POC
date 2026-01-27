import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { ActivityConfig } from "@task-types/ActivityConfig";
import { TaskStatus } from "@task-types/Task";
import { ParsedActivityData } from "@utils/parsers/activityParser";
import { validateAllScreens } from "@utils/validation/questionValidation";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import { useDataPointInstance } from "@hooks/useDataPointInstance";
import { useTaskAnswer } from "@hooks/useTaskAnswer";
import { useTaskUpdate } from "@hooks/useTaskUpdate";

const logger = getServiceLogger("useQuestionSubmission");

export interface UseQuestionSubmissionReturn {
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
}

export interface UseQuestionSubmissionOptions {
  taskId: string | undefined;
  entityId: string | undefined;
  answers: Record<string, any>;
  activityData: ParsedActivityData | null;
  activityConfig: ActivityConfig | null;
  onSuccess?: () => void;
  onNavigateToDashboard?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for handling question submission
 * Manages submission state and saves answers to TaskAnswer and DataPointInstance
 */
export const useQuestionSubmission = ({
  taskId,
  entityId,
  answers,
  activityData,
  activityConfig,
  onSuccess,
  onNavigateToDashboard,
  onError,
}: UseQuestionSubmissionOptions): UseQuestionSubmissionReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getAnswerByQuestionId, createTaskAnswer, updateTaskAnswer } =
    useTaskAnswer();
  const {
    getInstanceByQuestionId,
    createDataPointInstance,
    updateDataPointInstance,
  } = useDataPointInstance();
  const { updateTask } = useTaskUpdate();

  const handleSubmit = useCallback(async () => {
    // Guard against race condition: prevent double submission
    if (isSubmitting) {
      return;
    }

    if (!activityData) {
      Alert.alert("Error", "Activity data is not available.");
      return;
    }

    // Validate all answers
    const errors = validateAllScreens(activityData.screens, answers);
    if (Object.keys(errors).length > 0) {
      Alert.alert(
        "Validation Error",
        "Please fix the errors before submitting."
      );
      return;
    }

    if (!taskId || !entityId) {
      Alert.alert("Error", "Missing task or activity information.");
      return;
    }

    setIsSubmitting(true);
    const savedAnswers: string[] = [];
    const failedAnswers: { questionId: string; error: string }[] = [];

    try {
      // Save each answer as TaskAnswer with individual error handling
      for (const [questionId, answer] of Object.entries(answers)) {
        try {
          // Skip empty/null answers
          if (
            answer === null ||
            answer === undefined ||
            answer === "" ||
            (Array.isArray(answer) && answer.length === 0)
          ) {
            continue;
          }

          const answerString =
            typeof answer === "string" ? answer : JSON.stringify(answer);
          const pk = `TASK-ANSWER-${taskId}-${questionId}`;
          const sk = `SK-${Date.now()}-${questionId}`;

          // Find existing answer for this question
          const existing = getAnswerByQuestionId(taskId, questionId);

          if (existing) {
            const updated = await updateTaskAnswer(existing.id, {
              answer: answerString,
            });
            if (updated) {
              savedAnswers.push(questionId);
            }
          } else {
            const created = await createTaskAnswer({
              pk,
              sk,
              taskInstanceId: taskId,
              activityId: entityId,
              questionId,
              answer: answerString,
            });
            if (created) {
              savedAnswers.push(questionId);
            }
          }

          // Create or update DataPointInstance
          try {
            const dataPointPk = `DATAPOINT-${entityId}-${questionId}`;
            const dataPointSk = `SK-${Date.now()}-${questionId}`;
            const existingDataPoint = getInstanceByQuestionId(
              entityId,
              questionId
            );

            if (existingDataPoint) {
              await updateDataPointInstance(existingDataPoint.id, {
                answers: answerString,
              });
            } else {
              await createDataPointInstance({
                pk: dataPointPk,
                sk: dataPointSk,
                dataPointKey: questionId,
                activityId: entityId,
                questionId,
                answers: answerString,
              });
            }
          } catch (dataPointError: unknown) {
            // Don't fail the entire submission if data point creation fails
            logger.error("Error saving DataPointInstance", dataPointError);
          }
        } catch (error: unknown) {
          failedAnswers.push({
            questionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // If some answers failed, show warning but continue
      if (failedAnswers.length > 0) {
        Alert.alert(
          "Partial Success",
          `${savedAnswers.length} of ${
            Object.keys(answers).length
          } answers saved. Some answers failed to save.`
        );
      }

      // Determine task status based on answers
      // If we got here, validation passed (we return early if validation fails)
      // If validation passed and we have saved answers, mark as COMPLETED
      // If some answers were saved but some failed, mark as INPROGRESS
      if (taskId && activityData) {
        const totalQuestions = activityData.screens.reduce(
          (sum: number, screen: ParsedActivityData["screens"][number]) =>
            sum + screen.elements.length,
          0
        );
        const answeredQuestions = savedAnswers.length;
        const questionsWithAnswers = Object.keys(answers).filter(key => {
          const answer = answers[key];
          return (
            answer !== null &&
            answer !== undefined &&
            answer !== "" &&
            !(Array.isArray(answer) && answer.length === 0)
          );
        }).length;

        // If we got here, validation passed (all required questions are answered)
        // If no answers failed to save, task is complete
        // If some answers failed to save, task is in progress
        const allAnswersSaved = failedAnswers.length === 0;
        const someQuestionsAnswered = answeredQuestions > 0;

        logger.debug("Task status update", {
          taskId,
          totalQuestions,
          answeredQuestions,
          questionsWithAnswers,
          allAnswersSaved,
          someQuestionsAnswered,
          failedAnswersCount: failedAnswers.length,
          // Note: Validation passed (we got past the validation check)
        });

        if (allAnswersSaved && someQuestionsAnswered) {
          // Validation passed AND all answers saved successfully = COMPLETED
          logger.info("Updating task to COMPLETED");
          try {
            const updated = await updateTask(taskId, {
              status: TaskStatus.COMPLETED,
            });
            logger.info("Task updated to COMPLETED", {
              status: updated?.status,
              id: updated?.id,
            });
          } catch (error) {
            logger.error("Error updating task to COMPLETED", error);
          }
        } else if (someQuestionsAnswered) {
          // Validation passed but some answers failed to save = INPROGRESS
          logger.info("Updating task to INPROGRESS");
          try {
            const updated = await updateTask(taskId, {
              status: TaskStatus.INPROGRESS,
            });
            logger.info("Task updated to INPROGRESS", {
              status: updated?.status,
              id: updated?.id,
            });
          } catch (error) {
            logger.error("Error updating task to INPROGRESS", error);
          }
        } else {
          // No answers were saved at all - this shouldn't happen if validation passed
          logger.warn("Validation passed but no answers were saved", {
            taskId,
            savedAnswers,
            failedAnswers,
          });
        }
      }

      if (failedAnswers.length === 0) {
        // Show completion screen if configured
        if (activityConfig?.completionScreen?.showScreen) {
          onSuccess?.();
        } else {
          Alert.alert("Success", "All answers submitted and task completed!", [
            {
              text: "OK",
              onPress: () => {
                onNavigateToDashboard?.();
              },
            },
          ]);
        }
      } else {
        Alert.alert(
          "Warning",
          `Only ${savedAnswers.length} of ${
            Object.keys(answers).length
          } answers were saved. Please try again.`
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save answers. Please try again.";
      Alert.alert("Error", errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    taskId,
    entityId,
    answers,
    activityData,
    activityConfig,
    getAnswerByQuestionId,
    getInstanceByQuestionId,
    createTaskAnswer,
    updateTaskAnswer,
    createDataPointInstance,
    updateDataPointInstance,
    updateTask,
    onSuccess,
    onNavigateToDashboard,
    onError,
  ]);

  return {
    isSubmitting,
    handleSubmit,
  };
};
