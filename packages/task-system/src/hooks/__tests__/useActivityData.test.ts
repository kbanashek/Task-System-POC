import { renderHook, waitFor } from "@testing-library/react-native";
import { useActivityData } from "@hooks/useActivityData";

// Mock hooks
jest.mock("@hooks/useActivity", () => ({
  useActivity: jest.fn(),
}));

jest.mock("@hooks/useTaskAnswer", () => ({
  useTaskAnswer: jest.fn(),
}));

jest.mock("@utils/parsers/activityParser", () => ({
  parseActivityConfig: jest.fn(),
}));

import { useActivity } from "@hooks/useActivity";
import { useTaskAnswer } from "@hooks/useTaskAnswer";
import { parseActivityConfig } from "@utils/parsers/activityParser";
import { Activity } from "@task-types/Activity";
import { ParsedActivityData } from "@utils/parsers/activityParser";
import { ActivityConfig } from "@task-types/ActivityConfig";
import { TaskAnswer } from "@task-types/TaskAnswer";

describe("useActivityData", () => {
  const mockUseActivity = useActivity as jest.MockedFunction<
    typeof useActivity
  >;
  const mockUseTaskAnswer = useTaskAnswer as jest.MockedFunction<
    typeof useTaskAnswer
  >;
  const mockParseActivityConfig = parseActivityConfig as jest.MockedFunction<
    typeof parseActivityConfig
  >;

  const mockActivity: Activity = {
    id: "1",
    pk: "ACTIVITY-1",
    sk: "SK-1",
    name: "Test Activity",
    title: "Test Title",
    description: "Test Description",
    type: "QUESTIONNAIRE",
    layouts: JSON.stringify({
      activityGroups: [],
      layouts: [],
      introductionScreen: { showScreen: true },
      summaryScreen: { showScreen: true },
      completionScreen: { showScreen: true },
    }),
    activityGroups: JSON.stringify([]),
  };

  const mockParsedActivityData: ParsedActivityData = {
    screens: [
      {
        id: "screen-1",
        name: "Screen 1",
        order: 1,
        elements: [],
        displayProperties: {},
      },
    ],
    questions: [],
  };

  const mockActivityConfig: ActivityConfig = {
    introductionScreen: { showScreen: true },
    summaryScreen: { showScreen: true },
    completionScreen: { showScreen: true },
  };

  const mockTaskAnswers: TaskAnswer[] = [
    {
      id: "1",
      pk: "ANSWER-1",
      sk: "SK-1",
      taskInstanceId: "TASK-1",
      questionId: "QUESTION-1",
      answer: JSON.stringify("Answer 1"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loading state", () => {
    it("starts with loading true", () => {
      mockUseActivity.mockReturnValue({
        activity: null,
        loading: true,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );
      expect(result.current.loading).toBe(true);
    });

    it("sets loading false after activity loads", async () => {
      mockUseActivity.mockReturnValue({
        activity: mockActivity,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockReturnValue(mockParsedActivityData);
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("error handling", () => {
    it("sets error when entityId is not provided", async () => {
      mockUseActivity.mockReturnValue({
        activity: null,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      const { result } = renderHook(() =>
        useActivityData({ entityId: undefined, taskId: "TASK-1" })
      );
      // When taskId is provided, the hook waits for entityId (task-derived fallback) instead of hard-erroring.
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(true);
    });

    it("sets error when entityId is not provided and taskId is also missing", async () => {
      mockUseActivity.mockReturnValue({
        activity: null,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });

      const { result } = renderHook(() =>
        useActivityData({ entityId: undefined, taskId: undefined })
      );

      await waitFor(() => {
        expect(result.current.error).toContain(
          "This task does not have an associated activity"
        );
        expect(result.current.loading).toBe(false);
      });
    });

    it("sets error when activity is not found", async () => {
      mockUseActivity.mockReturnValue({
        activity: null,
        loading: false,
        error: "Activity not found",
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );
      await waitFor(() => {
        expect(result.current.error).toBe("Activity not found");
        expect(result.current.loading).toBe(false);
      });
    });

    it("handles parsing errors gracefully", async () => {
      mockUseActivity.mockReturnValue({
        activity: mockActivity,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockImplementation(() => {
        throw new Error("Parse failed");
      });
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );
      await waitFor(() => {
        expect(result.current.error).toBe("Parse failed");
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe("activity data parsing", () => {
    it("parses activity config correctly", async () => {
      mockUseActivity.mockReturnValue({
        activity: mockActivity,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockReturnValue(mockParsedActivityData);
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );
      await waitFor(() => {
        expect(result.current.activityData).toEqual(mockParsedActivityData);
        expect(result.current.loading).toBe(false);
      });
    });

    it("extracts activity config from layouts JSON", async () => {
      mockUseActivity.mockReturnValue({
        activity: mockActivity,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockReturnValue(mockParsedActivityData);
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );
      await waitFor(() => {
        expect(result.current.activityConfig).toBeDefined();
        expect(result.current.activityConfig?.introductionScreen).toBeDefined();
        expect(result.current.activityConfig?.summaryScreen).toBeDefined();
        expect(result.current.activityConfig?.completionScreen).toBeDefined();
      });
    });

    it("handles double-encoded layouts JSON (common from host metadata loaders)", async () => {
      const doubleEncodedActivity: Activity = {
        ...mockActivity,
        // layouts is a JSON string that itself contains a JSON string
        layouts: JSON.stringify(mockActivity.layouts),
      };

      mockUseActivity.mockReturnValue({
        activity: doubleEncodedActivity,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockReturnValue(mockParsedActivityData);

      renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );

      await waitFor(() => {
        expect(mockParseActivityConfig).toHaveBeenCalled();
      });

      const [passedConfig] = mockParseActivityConfig.mock.calls[0] as [
        ActivityConfig,
        Record<string, unknown>,
      ];

      // The hook should recover the full config object and expose introduction/summary/completion.
      expect(passedConfig.introductionScreen).toBeDefined();
      expect(passedConfig.summaryScreen).toBeDefined();
      expect(passedConfig.completionScreen).toBeDefined();
    });

    it("unwraps container objects that include layouts/screens but not intro/summary/completion keys", async () => {
      const containerOnly: Activity = {
        ...mockActivity,
        // Container shape: { layouts: [...] } with no activityGroups/introduction/etc
        layouts: JSON.stringify({
          layouts: [
            {
              type: "MOBILE",
              screens: [],
            },
          ],
          screens: [],
        }),
        activityGroups: null,
      };

      mockUseActivity.mockReturnValue({
        activity: containerOnly,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockReturnValue(mockParsedActivityData);

      renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );

      await waitFor(() => {
        expect(mockParseActivityConfig).toHaveBeenCalled();
      });

      const [passedConfig] = mockParseActivityConfig.mock.calls[0] as [
        ActivityConfig,
        Record<string, unknown>,
      ];

      expect(Array.isArray(passedConfig.layouts)).toBe(true);
      expect(passedConfig.layouts?.[0]?.type).toBe("MOBILE");
      expect(Array.isArray(passedConfig.screens)).toBe(true);
    });
  });

  describe("initial answers", () => {
    it("loads initial answers from TaskAnswer", async () => {
      mockUseActivity.mockReturnValue({
        activity: mockActivity,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      const getAnswersByTaskId = jest.fn(() => mockTaskAnswers);
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: mockTaskAnswers,
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId,
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockReturnValue(mockParsedActivityData);
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );
      await waitFor(() => {
        expect(getAnswersByTaskId).toHaveBeenCalledWith("TASK-1");
        expect(result.current.initialAnswers).toEqual({
          "QUESTION-1": "Answer 1",
        });
      });
    });

    it("handles JSON parsing errors in answers", async () => {
      const invalidJsonAnswers: TaskAnswer[] = [
        {
          id: "1",
          pk: "ANSWER-1",
          sk: "SK-1",
          taskInstanceId: "TASK-1",
          questionId: "QUESTION-1",
          answer: "Invalid JSON {",
        },
      ];
      mockUseActivity.mockReturnValue({
        activity: mockActivity,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: invalidJsonAnswers,
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => invalidJsonAnswers),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockReturnValue(mockParsedActivityData);
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: "TASK-1" })
      );
      await waitFor(() => {
        expect(result.current.initialAnswers["QUESTION-1"]).toBe(
          "Invalid JSON {"
        );
      });
    });

    it("returns empty initialAnswers when no taskId provided", async () => {
      mockUseActivity.mockReturnValue({
        activity: mockActivity,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });
      mockUseTaskAnswer.mockReturnValue({
        taskAnswers: [],
        loading: false,
        error: null,
        isCreating: false,
        isUpdating: false,
        getAnswersByTaskId: jest.fn(() => []),
        getAnswerByQuestionId: jest.fn(),
        createTaskAnswer: jest.fn(),
        updateTaskAnswer: jest.fn(),
      });
      mockParseActivityConfig.mockReturnValue(mockParsedActivityData);
      const { result } = renderHook(() =>
        useActivityData({ entityId: "ACTIVITY-1", taskId: undefined })
      );
      await waitFor(() => {
        expect(result.current.initialAnswers).toEqual({});
      });
    });
  });
});
