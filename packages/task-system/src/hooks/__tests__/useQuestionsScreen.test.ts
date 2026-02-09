import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useQuestionsScreen } from "@hooks/useQuestionsScreen";
import { TaskStatus, TaskType } from "@task-types/Task";

// Mock react-navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
  CommonActions: {
    reset: jest.fn(),
  },
}));

// Mock DataStore
jest.mock("@aws-amplify/datastore", () => ({
  DataStore: {
    observe: jest.fn(),
  },
}));

// Mock TaskService
jest.mock("@services/TaskService", () => ({
  TaskService: {
    getTaskById: jest.fn(),
    updateTask: jest.fn(),
  },
}));

// Mock hooks
jest.mock("@hooks/useActivityData", () => ({
  useActivityData: jest.fn(),
}));

jest.mock("@hooks/useAnswerManagement", () => ({
  useAnswerManagement: jest.fn(),
}));

jest.mock("@hooks/useQuestionValidation", () => ({
  useQuestionValidation: jest.fn(),
}));

jest.mock("@hooks/useQuestionNavigation", () => ({
  useQuestionNavigation: jest.fn(),
}));

jest.mock("@hooks/useQuestionSubmission", () => ({
  useQuestionSubmission: jest.fn(),
}));

jest.mock("@services/TempAnswerSyncService", () => ({
  TempAnswerSyncService: {
    saveTempAnswers: jest.fn(),
  },
}));

import { useNavigation, useRoute } from "@react-navigation/native";
import { DataStore } from "@aws-amplify/datastore";
import { TaskService } from "@services/TaskService";
import { useActivityData } from "@hooks/useActivityData";
import { useAnswerManagement } from "@hooks/useAnswerManagement";
import { useQuestionValidation } from "@hooks/useQuestionValidation";
import { useQuestionNavigation } from "@hooks/useQuestionNavigation";
import { useQuestionSubmission } from "@hooks/useQuestionSubmission";
import { TempAnswerSyncService } from "@services/TempAnswerSyncService";
import { Task } from "@task-types/Task";
import { ParsedActivityData } from "@utils/parsers/activityParser";
import { ActivityConfig } from "@task-types/ActivityConfig";

describe("useQuestionsScreen", () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockDispatch = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;
  const mockDataStoreObserve = DataStore.observe as jest.MockedFunction<
    typeof DataStore.observe
  >;
  const mockGetTaskById = TaskService.getTaskById as jest.MockedFunction<
    typeof TaskService.getTaskById
  >;
  const mockUpdateTask = TaskService.updateTask as jest.MockedFunction<
    typeof TaskService.updateTask
  >;
  const mockUseActivityData = useActivityData as jest.MockedFunction<
    typeof useActivityData
  >;
  const mockUseAnswerManagement = useAnswerManagement as jest.MockedFunction<
    typeof useAnswerManagement
  >;
  const mockUseQuestionValidation =
    useQuestionValidation as jest.MockedFunction<typeof useQuestionValidation>;
  const mockUseQuestionNavigation =
    useQuestionNavigation as jest.MockedFunction<typeof useQuestionNavigation>;
  const mockUseQuestionSubmission =
    useQuestionSubmission as jest.MockedFunction<typeof useQuestionSubmission>;

  const mockTask: Task = {
    id: "TASK-1",
    pk: "TASK-1",
    sk: "SK-1",
    title: "Test Task",
    description: "Test Description",
    status: TaskStatus.OPEN,
    taskType: TaskType.SCHEDULED,
    startTimeInMillSec: Date.now(),
    expireTimeInMillSec: Date.now() + 86400000,
    entityId: "ACTIVITY-1",
  };

  const mockActivityData: ParsedActivityData = {
    questions: [],
    screens: [
      {
        id: "screen-1",
        name: "Screen 1",
        order: 1,
        elements: [],
        displayProperties: {},
      },
    ],
  };

  const mockActivityConfig: ActivityConfig = {
    introductionScreen: { showScreen: true },
    summaryScreen: { showScreen: true },
    completionScreen: { showScreen: true },
  };

  const mockNavigationHandlers = {
    handleNext: jest.fn(),
    handlePrevious: jest.fn(),
    handleBegin: jest.fn(),
    handleBackToQuestions: jest.fn(),
    handleEditQuestion: jest.fn(),
    handleReviewOrSubmit: jest.fn(),
    handleCompletionDone: jest.fn(),
    handleBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({
      params: { taskId: "TASK-1", entityId: "ACTIVITY-1" },
    } as any);
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: mockDispatch,
    } as any);
    mockGetTaskById.mockResolvedValue(mockTask as any);
    mockDataStoreObserve.mockReturnValue({
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    } as any);
    mockUseActivityData.mockReturnValue({
      loading: false,
      error: null,
      activity: { id: "a1", pk: "ACTIVITY-1", sk: "SK-1", name: "A" } as any,
      activityData: mockActivityData,
      activityConfig: mockActivityConfig,
      initialAnswers: {},
    });
    mockUseAnswerManagement.mockReturnValue({
      answers: {},
      errors: {},
      setAnswers: jest.fn(),
      setErrors: jest.fn(),
      handleAnswerChange: jest.fn(),
    });
    mockUseQuestionValidation.mockReturnValue({
      currentScreenValid: true,
      validateCurrentScreen: jest.fn(() => true),
    });
    mockUseQuestionNavigation.mockImplementation((options: any) => ({
      ...mockNavigationHandlers,
      handleNext: () => {
        mockNavigationHandlers.handleNext();
        options.onLeaveScreen?.();
      },
      handlePrevious: () => {
        mockNavigationHandlers.handlePrevious();
        options.onLeaveScreen?.();
      },
      handleReviewOrSubmit: () => {
        mockNavigationHandlers.handleReviewOrSubmit();
        options.onLeaveScreen?.();
      },
    }));
    mockUseQuestionSubmission.mockReturnValue({
      isSubmitting: false,
      handleSubmit: jest.fn(),
    });
  });

  describe("initialization", () => {
    it("extracts taskId and entityId from route params", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.taskId).toBe("TASK-1");
      expect(result.current.entityId).toBe("ACTIVITY-1");
    });

    it("prefers explicit params over route params", async () => {
      mockUseRoute.mockReturnValue({
        params: { taskId: "TASK-ROUTE", entityId: "ACTIVITY-ROUTE" },
      } as any);

      const { result } = renderHook(() =>
        useQuestionsScreen({
          taskId: "TASK-OVERRIDE",
          entityId: "ACTIVITY-OVERRIDE",
        })
      );

      expect(result.current.taskId).toBe("TASK-OVERRIDE");
      expect(result.current.entityId).toBe("ACTIVITY-OVERRIDE");

      await waitFor(() => {
        expect(mockGetTaskById).toHaveBeenCalledWith("TASK-OVERRIDE");
      });
    });

    it("fetches task on mount", async () => {
      renderHook(() => useQuestionsScreen());
      await waitFor(() => {
        expect(mockGetTaskById).toHaveBeenCalledWith("TASK-1");
      });
    });

    it("subscribes to task updates", () => {
      renderHook(() => useQuestionsScreen());
      expect(mockDataStoreObserve).toHaveBeenCalled();
    });

    it("returns activity data from useActivityData", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.activityData).toEqual(mockActivityData);
      expect(result.current.activityConfig).toEqual(mockActivityConfig);
    });

    it("returns answers and errors from useAnswerManagement", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.answers).toEqual({});
      expect(result.current.errors).toEqual({});
    });

    it("returns validation state from useQuestionValidation", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.currentScreenValid).toBe(true);
    });

    it("normalizes ActivityRef route entityId to uuid", () => {
      mockUseRoute.mockReturnValue({
        params: {
          taskId: "TASK-1",
          entityId:
            "ActivityRef#Arm.111#ActivityGroup.222#Activity.ad93b50d-7d49-4128-8a59-91275e77f3c8",
        },
      } as any);

      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.entityId).toBe(
        "ad93b50d-7d49-4128-8a59-91275e77f3c8"
      );
    });

    it("normalizes Activity.<uuid> route entityId to uuid", () => {
      mockUseRoute.mockReturnValue({
        params: {
          taskId: "TASK-1",
          entityId: "Activity.ad93b50d-7d49-4128-8a59-91275e77f3c8",
        },
      } as any);

      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.entityId).toBe(
        "ad93b50d-7d49-4128-8a59-91275e77f3c8"
      );
    });

    it("falls back to task-derived entityId when route entityId is invalid ActivityRef token", async () => {
      mockUseRoute.mockReturnValue({
        params: { taskId: "TASK-1", entityId: "ActivityRef" },
      } as any);

      const { result } = renderHook(() => useQuestionsScreen());

      await waitFor(() => {
        expect(result.current.entityId).toBe("ACTIVITY-1");
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("introduction screen", () => {
    it("shows introduction when activity config specifies it", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.showIntroduction).toBe(true);
      expect(result.current.currentScreenIndex).toBe(-1);
    });

    it("hides introduction when activity config doesn't specify it", () => {
      mockUseActivityData.mockReturnValue({
        loading: false,
        error: null,
        activity: { id: "a1", pk: "ACTIVITY-1", sk: "SK-1", name: "A" } as any,
        activityData: mockActivityData,
        activityConfig: { introductionScreen: { showScreen: false } },
        initialAnswers: {},
      });
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.showIntroduction).toBe(false);
      expect(result.current.currentScreenIndex).toBe(0);
    });
  });

  describe("temp answer sync on navigation boundaries", () => {
    it("syncs temp answers on handleNext/handlePrevious/handleReviewSubmit", async () => {
      const { result } = renderHook(() => useQuestionsScreen());

      await waitFor(() => {
        expect(result.current.task).toBeTruthy();
      });

      await act(async () => {
        result.current.handleNext();
        result.current.handlePrevious();
        result.current.handleReviewSubmit();
      });

      expect(TempAnswerSyncService.saveTempAnswers).toHaveBeenCalledTimes(3);
    });
  });

  describe("task status update on begin", () => {
    it("updates task to STARTED when beginning if task is OPEN", async () => {
      const { result } = renderHook(() => useQuestionsScreen());
      await waitFor(() => {
        expect(result.current.task).toEqual(mockTask);
      });

      await act(async () => {
        await result.current.handleBegin();
      });

      expect(mockUpdateTask).toHaveBeenCalledWith("TASK-1", {
        status: TaskStatus.STARTED,
      });
      expect(mockNavigationHandlers.handleBegin).toHaveBeenCalled();
    });

    it("does not update task if already STARTED", async () => {
      const startedTask: Task = {
        ...mockTask,
        status: TaskStatus.STARTED,
      };
      mockGetTaskById.mockResolvedValue(startedTask as any);
      const { result } = renderHook(() => useQuestionsScreen());
      await waitFor(() => {
        expect(result.current.task?.status).toBe(TaskStatus.STARTED);
      });

      await act(async () => {
        await result.current.handleBegin();
      });

      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockNavigationHandlers.handleBegin).toHaveBeenCalled();
    });

    it("does not update task if already INPROGRESS", async () => {
      const inProgressTask: Task = {
        ...mockTask,
        status: TaskStatus.INPROGRESS,
      };
      mockGetTaskById.mockResolvedValue(inProgressTask as any);
      const { result } = renderHook(() => useQuestionsScreen());
      await waitFor(() => {
        expect(result.current.task?.status).toBe(TaskStatus.INPROGRESS);
      });

      await act(async () => {
        await result.current.handleBegin();
      });

      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockNavigationHandlers.handleBegin).toHaveBeenCalled();
    });
  });

  describe("task subscription updates", () => {
    it("updates task when subscription fires", async () => {
      let subscriptionCallback: ((msg: any) => void) | null = null;
      mockDataStoreObserve.mockReturnValue({
        subscribe: (callback: any) => {
          subscriptionCallback = callback;
          return { unsubscribe: jest.fn() };
        },
      } as any);
      const { result } = renderHook(() => useQuestionsScreen());
      await waitFor(() => {
        expect(result.current.task).toEqual(mockTask);
      });

      const updatedTask: Task = {
        ...mockTask,
        status: TaskStatus.STARTED,
      };

      if (subscriptionCallback) {
        (subscriptionCallback as any)({
          element: updatedTask,
          opType: "UPDATE",
        });
      }

      await waitFor(() => {
        expect(result.current.task?.status).toBe(TaskStatus.STARTED);
      });
    });

    it("only updates task when subscription matches taskId", async () => {
      let subscriptionCallback: ((msg: any) => void) | null = null;
      mockDataStoreObserve.mockReturnValue({
        subscribe: (callback: any) => {
          subscriptionCallback = callback;
          return { unsubscribe: jest.fn() };
        },
      } as any);
      const { result } = renderHook(() => useQuestionsScreen());
      await waitFor(() => {
        expect(result.current.task).toEqual(mockTask);
      });

      const otherTask: Task = {
        ...mockTask,
        id: "TASK-2",
        status: TaskStatus.STARTED,
      };

      if (subscriptionCallback) {
        (subscriptionCallback as any)({
          element: otherTask,
          opType: "UPDATE",
        });
      }

      await waitFor(() => {
        expect(result.current.task?.id).toBe("TASK-1");
      });
    });
  });

  describe("initial answers", () => {
    it("updates answers when initialAnswers change", () => {
      const setAnswers = jest.fn();
      mockUseAnswerManagement.mockReturnValue({
        answers: {},
        errors: {},
        setAnswers,
        setErrors: jest.fn(),
        handleAnswerChange: jest.fn(),
      });
      mockUseActivityData.mockReturnValue({
        loading: false,
        error: null,
        activity: null,
        activityData: mockActivityData,
        activityConfig: mockActivityConfig,
        initialAnswers: { q1: "Answer 1" },
      });
      const { rerender } = renderHook(() => useQuestionsScreen());
      rerender(undefined);
      expect(setAnswers).toHaveBeenCalledWith({ q1: "Answer 1" });
    });
  });

  describe("completion state", () => {
    it("hides completion when introduction is shown", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.showIntroduction).toBe(true);
      expect(result.current.showCompletion).toBe(false);
    });
  });

  describe("navigation handlers", () => {
    it("delegates handleNext to useQuestionNavigation", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      act(() => {
        result.current.handleNext();
      });
      expect(mockNavigationHandlers.handleNext).toHaveBeenCalled();
    });

    it("delegates handlePrevious to useQuestionNavigation", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      act(() => {
        result.current.handlePrevious();
      });
      expect(mockNavigationHandlers.handlePrevious).toHaveBeenCalled();
    });

    it("delegates handleBackToQuestions to useQuestionNavigation", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      act(() => {
        result.current.handleBackToQuestions();
      });
      expect(mockNavigationHandlers.handleBackToQuestions).toHaveBeenCalled();
    });

    it("delegates handleEditQuestion to useQuestionNavigation", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      act(() => {
        result.current.handleEditQuestion("q1");
      });
      expect(mockNavigationHandlers.handleEditQuestion).toHaveBeenCalledWith(
        "q1"
      );
    });

    it("delegates handleReviewSubmit to useQuestionNavigation", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      act(() => {
        result.current.handleReviewSubmit();
      });
      expect(mockNavigationHandlers.handleReviewOrSubmit).toHaveBeenCalled();
    });

    it("delegates handleCompletionDone to useQuestionNavigation", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      act(() => {
        result.current.handleCompletionDone();
      });
      expect(mockNavigationHandlers.handleCompletionDone).toHaveBeenCalled();
    });

    it("delegates handleBack to useQuestionNavigation", () => {
      const { result } = renderHook(() => useQuestionsScreen());
      act(() => {
        result.current.handleBack();
      });
      expect(mockNavigationHandlers.handleBack).toHaveBeenCalled();
    });
  });

  describe("submission", () => {
    it("shows completion screen on successful submission", async () => {
      const handleSubmit = jest.fn();
      mockUseQuestionSubmission.mockReturnValue({
        isSubmitting: false,
        handleSubmit,
      });
      const { result } = renderHook(() => useQuestionsScreen());

      // Simulate onSuccess callback
      const onSuccess = (mockUseQuestionSubmission.mock.calls[0]?.[0] as any)
        ?.onSuccess;
      if (onSuccess) {
        act(() => {
          onSuccess();
        });
      }

      await waitFor(() => {
        expect(result.current.showCompletion).toBe(true);
        expect(result.current.showReview).toBe(false);
        expect(result.current.cameFromReview).toBe(false);
      });
    });

    it("returns isSubmitting from useQuestionSubmission", () => {
      mockUseQuestionSubmission.mockReturnValue({
        isSubmitting: true,
        handleSubmit: jest.fn(),
      });
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.isSubmitting).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles missing taskId in route params", () => {
      mockUseRoute.mockReturnValue({
        params: { entityId: "ACTIVITY-1" },
      } as any);
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.taskId).toBeUndefined();
    });

    it("handles missing entityId in route params", () => {
      mockUseRoute.mockReturnValue({
        params: { taskId: "TASK-1" },
      } as any);
      const { result } = renderHook(() => useQuestionsScreen());
      expect(result.current.entityId).toBeUndefined();
    });

    it("handles task fetch errors gracefully", async () => {
      mockGetTaskById.mockRejectedValue(new Error("Fetch failed"));
      const { result } = renderHook(() => useQuestionsScreen());
      await waitFor(() => {
        expect(result.current.task).toBeNull();
      });
    });
  });
});
