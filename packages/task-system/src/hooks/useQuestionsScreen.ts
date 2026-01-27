import { DataStore } from "@aws-amplify/datastore";
import { useActivityData } from "@hooks/useActivityData";
import { useAnswerManagement } from "@hooks/useAnswerManagement";
import { useQuestionNavigation } from "@hooks/useQuestionNavigation";
import { useQuestionSubmission } from "@hooks/useQuestionSubmission";
import { useQuestionValidation } from "@hooks/useQuestionValidation";
import { Task as DataStoreTask } from "@models/index";
import {
  CommonActions,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { TaskService } from "@services/TaskService";
import { TempAnswerSyncService } from "@services/TempAnswerSyncService";
import type { AnswerValue } from "@task-types/AnswerValue";
import { Task, TaskStatus } from "@task-types/Task";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import { extractActivityIdFromTask } from "@utils/tasks/taskUtils";
import { useCallback, useEffect, useMemo, useState } from "react";

const logger = getServiceLogger("useQuestionsScreen");

/**
 * Return type for the useQuestionsScreen hook.
 */
export interface UseQuestionsScreenReturn {
  // State
  loading: boolean;
  error: string | null;
  activityData: ReturnType<typeof useActivityData>["activityData"];
  activityConfig: ReturnType<typeof useActivityData>["activityConfig"];
  answers: ReturnType<typeof useAnswerManagement>["answers"];
  errors: ReturnType<typeof useAnswerManagement>["errors"];
  isSubmitting: boolean;
  currentScreenIndex: number;
  showIntroduction: boolean;
  showReview: boolean;
  showCompletion: boolean;
  currentScreenValid: boolean;
  cameFromReview: boolean;
  taskId: string | undefined;
  entityId: string | undefined;
  task: Task | null;

  // Actions
  handleAnswerChange: (questionId: string, answer: AnswerValue) => void;
  handleSubmit: () => Promise<void>;
  handleNext: () => void;
  handlePrevious: () => void;
  handleBegin: () => void;
  handleBackToQuestions: () => void;
  handleEditQuestion: (questionId: string) => void;
  handleReviewSubmit: () => void;
  handleCompletionDone: () => void;
  handleBack: () => void;
}

/**
 * Parameters for the useQuestionsScreen hook.
 */
export interface UseQuestionsScreenParams {
  taskId?: string;
  entityId?: string;
}

/**
 * Main hook for questions screen
 * Composes smaller hooks for activity data, answers, validation, navigation, and submission
 */
export const useQuestionsScreen = (
  params?: UseQuestionsScreenParams
): UseQuestionsScreenReturn => {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const taskId =
    params?.taskId ?? (route?.params?.taskId as string | undefined);
  const routeEntityId =
    params?.entityId ?? (route?.params?.entityId as string | undefined);

  // Fetch task to get status
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!taskId) {
      logger.debug("No taskId provided");
      setTask(null);
      return;
    }

    // Fetch initial task
    const fetchTask = async () => {
      try {
        logger.debug("Fetching task", { taskId });
        const fetchedTask = await TaskService.getTaskById(taskId);
        logger.debug("Fetched task", {
          id: fetchedTask?.id,
          status: fetchedTask?.status,
          statusType: typeof fetchedTask?.status,
          title: fetchedTask?.title,
        });
        // Type assertion: DataStore Task is compatible with our Task interface
        setTask(fetchedTask as Task | null);
      } catch (error) {
        logger.error("Error fetching task", error);
        // Don't set error state here - task status is optional for button text
      }
    };

    fetchTask();

    // Subscribe to task updates for real-time status changes
    const subscription = DataStore.observe(DataStoreTask).subscribe(msg => {
      if (msg.element.id === taskId) {
        logger.debug("Task updated via subscription", {
          id: msg.element.id,
          status: msg.element.status,
          opType: msg.opType,
        });
        setTask(msg.element as Task);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [taskId]);

  // Extract entityId from route params or fallback to extracting from task
  const entityId = useMemo(() => {
    if (routeEntityId) {
      return routeEntityId;
    }
    // Fallback: extract from task if available
    if (task) {
      const extractedId = extractActivityIdFromTask(task);
      if (extractedId) {
        logger.debug("Extracted entityId from task as fallback", {
          extractedId,
        });
        return extractedId;
      }
    }
    return undefined;
  }, [routeEntityId, task]);

  // Fetch and parse activity data
  const {
    loading,
    error,
    activity,
    activityData,
    activityConfig,
    initialAnswers,
  } = useActivityData({ entityId, taskId });

  // Initialize screen state based on activity config
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [showIntroduction, setShowIntroduction] = useState(false);

  // Manage answers and real-time validation
  const { answers, errors, setAnswers, setErrors, handleAnswerChange } =
    useAnswerManagement({
      activityData,
      currentScreenIndex,
      initialAnswers,
    });

  // Update answers when initialAnswers change
  useEffect(() => {
    const keys = Object.keys(initialAnswers);
    const preview = keys
      .slice(0, 3)
      .map(
        key => `${key}=${JSON.stringify(initialAnswers[key]).substring(0, 50)}`
      )
      .join(", ");

    logger.info("📝 initialAnswers RECEIVED in useQuestionsScreen", {
      count: keys.length,
      keys: keys.join(", "),
      preview,
      willSetAnswers: keys.length > 0 ? "yes" : "no",
    });
    if (keys.length > 0) {
      logger.info("✅ Setting answers from initialAnswers", {
        keys: keys.join(", "),
        preview,
      });
      setAnswers(initialAnswers);
    }
  }, [initialAnswers, setAnswers]);

  // Validation
  const { currentScreenValid, validateCurrentScreen } = useQuestionValidation({
    activityData,
    currentScreenIndex,
    answers,
    setErrors,
  });

  // Navigation state management
  const [showReview, setShowReview] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [cameFromReview, setCameFromReview] = useState(false);

  // Initialize screen state based on activity config
  useEffect(() => {
    // Only show introduction screen if activity config specifies it
    // BUT don't show introduction if completion screen is showing
    if (activityConfig?.introductionScreen?.showScreen) {
      setShowIntroduction(true);
      setCurrentScreenIndex(-1);
    } else {
      setCurrentScreenIndex(0);
      setShowIntroduction(false);
    }
  }, [activityConfig]);

  // Reset completion state when showing introduction (they're mutually exclusive)
  useEffect(() => {
    if (showIntroduction) {
      setShowCompletion(false);
    }
  }, [showIntroduction]);

  // Submission
  const { isSubmitting, handleSubmit } = useQuestionSubmission({
    taskId,
    entityId,
    answers,
    activityData,
    activityConfig,
    onSuccess: () => {
      setShowReview(false);
      setShowCompletion(true);
      setCameFromReview(false);
    },
    onNavigateToDashboard: () => {
      try {
        // Module-only behavior: reset back to the module dashboard route.
        nav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "TaskDashboard" as never }],
          })
        );
      } catch (error) {
        logger.warn("Failed to reset to module dashboard", error);
        // Last resort: try goBack (not ideal but better than crashing)
        try {
          const navAny = nav as any;
          if (navAny.canGoBack && navAny.canGoBack()) {
            navAny.goBack();
          }
        } catch (fallbackError) {
          logger.error("All navigation methods failed", fallbackError);
        }
      }
    },
  });

  // Navigation handlers
  // Save temp answers via DataStore (auto-syncs to cloud when online)
  const syncTempAnswers = useCallback(async () => {
    if (!task || !activity) return;
    if (!task.pk) return;

    const activityId = activity.pk ?? activity.id;
    if (!activityId) return;

    try {
      await TempAnswerSyncService.saveTempAnswers(
        task.pk,
        activityId,
        answers,
        new Date().toISOString()
      );
    } catch (error) {
      logger.error("Failed to save temp answers", error);
    }
  }, [task, activity, answers]);

  const navigation = useQuestionNavigation({
    activityData,
    activityConfig,
    currentScreenIndex,
    cameFromReview,
    currentScreenValid,
    validateCurrentScreen,
    onSubmit: handleSubmit,
    onLeaveScreen: syncTempAnswers,
    setErrors,
    setCurrentScreenIndex,
    setShowIntroduction,
    setShowReview,
    setShowCompletion,
    setCameFromReview,
  });

  // Enhanced handleBegin that updates task status before navigation
  const handleBeginWithStatusUpdate = useCallback(async () => {
    // If task exists and is not already started, update status to STARTED
    if (
      task &&
      task.status !== TaskStatus.STARTED &&
      task.status !== TaskStatus.INPROGRESS
    ) {
      try {
        logger.info("Updating task status to STARTED before begin");
        await TaskService.updateTask(task.id, {
          status: TaskStatus.STARTED,
        });
        // The DataStore subscription will pick up the update and refresh the task state
      } catch (error) {
        logger.error("Error updating task status", error);
      }
    }
    // Proceed with navigation
    navigation.handleBegin();
  }, [task, navigation]);

  return {
    // State
    loading,
    error,
    activityData,
    activityConfig,
    answers,
    errors,
    isSubmitting,
    currentScreenIndex,
    showIntroduction,
    showReview,
    showCompletion,
    currentScreenValid,
    cameFromReview,
    taskId,
    entityId,
    task,

    // Actions
    handleAnswerChange,
    handleSubmit,
    handleNext: navigation.handleNext,
    handlePrevious: navigation.handlePrevious,
    handleBegin: handleBeginWithStatusUpdate,
    handleBackToQuestions: navigation.handleBackToQuestions,
    handleEditQuestion: navigation.handleEditQuestion,
    handleReviewSubmit: navigation.handleReviewOrSubmit,
    handleCompletionDone: navigation.handleCompletionDone,
    handleBack: navigation.handleBack,
  };
};
