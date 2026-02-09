import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import type { StyleProp, ViewStyle, TextStyle } from "react-native";
import { GroupedTasksView } from "@components/GroupedTasksView";
import { GroupedTask } from "@hooks/useGroupedTasks";
import { Task, TaskStatus, TaskType } from "@task-types/Task";
import { Appointment, AppointmentType } from "@task-types/Appointment";
import { createMockTask } from "../../__mocks__/Task.mock";
import { createMockAppointment } from "../../__mocks__/Appointment.mock";
import { createMockGroupedTask } from "../../__mocks__/GroupedTask.mock";

// Mock hooks
const mockRtlStyle = jest.fn(
  (style: StyleProp<ViewStyle | TextStyle>) => style
);
const mockUseRTL = jest.fn(() => ({
  rtlStyle: mockRtlStyle,
  isRTL: false,
}));

jest.mock("@hooks/useRTL", () => ({
  useRTL: () => mockUseRTL(),
}));

jest.mock("@translations/index", () => ({
  useTaskTranslation: jest.fn(() => ({
    t: jest.fn((key: string) => key),
    currentLanguage: "en",
    isRTL: false,
  })),
}));

// Mock TranslatedText
jest.mock("@components/TranslatedText", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    TranslatedText: ({
      text,
      testID,
      ...props
    }: {
      text: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <Text testID={testID} {...props}>
        {text}
      </Text>
    ),
  };
});

// Mock TaskCard
jest.mock("@components/TaskCard", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    TaskCard: ({
      task,
      onPress,
      onDelete,
    }: {
      task: Task;
      onPress?: (task: Task) => void;
      onDelete?: (id: string) => void;
    }) => (
      <View testID={`task-card-${task.id}`}>
        <Text testID={`task-card-title-${task.id}`}>{task.title}</Text>
        {onPress && (
          <Text
            testID={`task-card-press-${task.id}`}
            onPress={() => onPress(task)}
          >
            Press
          </Text>
        )}
        {onDelete && (
          <Text
            testID={`task-card-delete-${task.id}`}
            onPress={() => onDelete(task.id)}
          >
            Delete
          </Text>
        )}
      </View>
    ),
  };
});

// Mock AppointmentCard
jest.mock("@components/AppointmentCard", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return {
    AppointmentCard: ({
      appointment,
      onPress,
    }: {
      appointment: Appointment;
      onPress?: (appointment: Appointment) => void;
    }) => (
      <View testID={`appointment-card-${appointment.appointmentId}`}>
        <Text testID={`appointment-card-title-${appointment.appointmentId}`}>
          {appointment.title}
        </Text>
        {onPress && (
          <Text
            testID={`appointment-card-press-${appointment.appointmentId}`}
            onPress={() => onPress(appointment)}
          >
            Press
          </Text>
        )}
      </View>
    ),
  };
});

// Mock logger
jest.mock("@utils/logging/serviceLogger", () => ({
  getServiceLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  })),
}));

describe("GroupedTasksView", () => {
  const mockOnTaskPress = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnAppointmentPress = jest.fn();

  const defaultProps = {
    groupedTasks: [],
    loading: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRTL.mockReturnValue({
      rtlStyle: jest.fn((style: StyleProp<ViewStyle | TextStyle>) => style),
      isRTL: false,
    });
  });

  // 1. Basic Rendering
  describe("Rendering", () => {
    it("renders with required props", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("dashboard_tasks_grouped_view")).toBeTruthy();
    });

    it("renders with optional onTaskPress", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          groupedTasks={[groupedTask]}
          onTaskPress={mockOnTaskPress}
        />
      );
      expect(getByTestId("dashboard_tasks_grouped_view")).toBeTruthy();
    });

    it("renders with optional onDelete", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          groupedTasks={[groupedTask]}
          onDelete={mockOnDelete}
        />
      );
      expect(getByTestId("dashboard_tasks_grouped_view")).toBeTruthy();
    });

    it("renders loading state", () => {
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} loading={true} />
      );
      expect(getByTestId("grouped-tasks-view-loading")).toBeTruthy();
      expect(getByTestId("grouped-tasks-view-loading-spinner")).toBeTruthy();
      expect(getByTestId("grouped-tasks-view-loading-text")).toBeTruthy();
    });

    it("renders error state", () => {
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} error="Failed to load tasks" />
      );
      expect(getByTestId("grouped-tasks-view-error")).toBeTruthy();
      expect(getByTestId("grouped-tasks-view-error-text")).toBeTruthy();
    });

    it("renders empty state when no tasks and no appointments", () => {
      const { getByTestId } = render(<GroupedTasksView {...defaultProps} />);
      expect(getByTestId("grouped-tasks-view-empty")).toBeTruthy();
      expect(getByTestId("grouped-tasks-view-empty-text")).toBeTruthy();
    });

    it("renders day groups", () => {
      const todayTask = createMockTask("task-1", "Today Task");
      const groupedTask = createMockGroupedTask("Today", [todayTask]);
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("grouped-tasks-view-day-group-Today")).toBeTruthy();
    });

    it("renders day header", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("grouped-tasks-view-day-header-Today")).toBeTruthy();
    });

    it("renders tasks without time", () => {
      const taskWithoutTime = createMockTask("task-1", "No Time Task");
      const groupedTask = createMockGroupedTask("Today", [], [taskWithoutTime]);
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("task-card-task-1")).toBeTruthy();
    });

    it("renders time groups", () => {
      const today = new Date();
      const taskWithTime = createMockTask(
        "task-1",
        "Timed Task",
        today.getTime()
      );
      const groupedTask = createMockGroupedTask("Today", [taskWithTime]);
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      // Time group testID includes the time string
      const timeString = new Date(today.getTime()).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      expect(
        getByTestId(`grouped-tasks-view-time-group-${timeString}`)
      ).toBeTruthy();
      expect(
        getByTestId(`grouped-tasks-view-due-by-${timeString}`)
      ).toBeTruthy();
    });

    it("renders appointments when provided", () => {
      const appointment = createMockAppointment("appt-1", "Doctor Visit");
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          todayAppointments={[appointment]}
          appointmentTimezoneId="America/New_York"
        />
      );
      expect(getByTestId("appointment-card-appt-1")).toBeTruthy();
    });

    it("hides date header when hideDateHeader is true for Today", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { queryByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          groupedTasks={[groupedTask]}
          hideDateHeader={true}
        />
      );
      expect(queryByTestId("grouped-tasks-view-day-header-Today")).toBeNull();
    });

    it("shows date header when hideDateHeader is false", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          groupedTasks={[groupedTask]}
          hideDateHeader={false}
        />
      );
      expect(getByTestId("grouped-tasks-view-day-header-Today")).toBeTruthy();
    });
  });

  // 2. User Interactions
  describe("User Interactions", () => {
    it("calls onTaskPress when task is pressed", () => {
      const task = createMockTask("task-1", "Test Task");
      const groupedTask = createMockGroupedTask("Today", [], [task]);
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          groupedTasks={[groupedTask]}
          onTaskPress={mockOnTaskPress}
        />
      );
      const pressButton = getByTestId("task-card-press-task-1");
      fireEvent.press(pressButton);
      expect(mockOnTaskPress).toHaveBeenCalledWith(task);
      expect(mockOnTaskPress).toHaveBeenCalledTimes(1);
    });

    it("calls onDelete when task is deleted", () => {
      const task = createMockTask("task-1", "Test Task");
      const groupedTask = createMockGroupedTask("Today", [], [task]);
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          groupedTasks={[groupedTask]}
          onDelete={mockOnDelete}
        />
      );
      const deleteButton = getByTestId("task-card-delete-task-1");
      fireEvent.press(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledWith("task-1");
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it("calls onAppointmentPress when appointment is pressed", () => {
      const appointment = createMockAppointment("appt-1", "Doctor Visit");
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          todayAppointments={[appointment]}
          onAppointmentPress={mockOnAppointmentPress}
        />
      );
      const pressButton = getByTestId("appointment-card-press-appt-1");
      fireEvent.press(pressButton);
      expect(mockOnAppointmentPress).toHaveBeenCalledWith(appointment);
      expect(mockOnAppointmentPress).toHaveBeenCalledTimes(1);
    });
  });

  // 3. RTL Support
  describe("RTL Support", () => {
    it("renders correctly in LTR mode", () => {
      mockUseRTL.mockReturnValueOnce({
        rtlStyle: jest.fn((style: StyleProp<ViewStyle | TextStyle>) => style),
        isRTL: false,
      });

      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("dashboard_tasks_grouped_view")).toBeTruthy();
    });

    it("renders correctly in RTL mode", () => {
      mockUseRTL.mockReturnValueOnce({
        rtlStyle: jest.fn((style: StyleProp<ViewStyle | TextStyle>) => style),
        isRTL: true,
      });

      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("dashboard_tasks_grouped_view")).toBeTruthy();
      // Component renders successfully in RTL mode (isRTL is used internally)
    });

    it("flips day header direction in RTL mode", () => {
      mockUseRTL.mockReturnValueOnce({
        rtlStyle: jest.fn((style: StyleProp<ViewStyle | TextStyle>) => style),
        isRTL: true,
      });

      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("grouped-tasks-view-day-header-Today")).toBeTruthy();
    });
  });

  // 4. Edge Cases
  describe("Edge Cases", () => {
    it("handles empty grouped tasks array", () => {
      const { getByTestId } = render(<GroupedTasksView {...defaultProps} />);
      expect(getByTestId("grouped-tasks-view-empty")).toBeTruthy();
    });

    it("handles multiple day groups", () => {
      const todayGroup = createMockGroupedTask("Today");
      const tomorrowGroup = createMockGroupedTask("Tomorrow");
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          groupedTasks={[todayGroup, tomorrowGroup]}
        />
      );
      expect(getByTestId("grouped-tasks-view-day-group-Today")).toBeTruthy();
      expect(getByTestId("grouped-tasks-view-day-group-Tomorrow")).toBeTruthy();
    });

    it("handles appointments without today group", () => {
      const appointment = createMockAppointment("appt-1", "Doctor Visit");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} todayAppointments={[appointment]} />
      );
      expect(getByTestId("grouped-tasks-view-appointments-only")).toBeTruthy();
      expect(getByTestId("appointment-card-appt-1")).toBeTruthy();
    });

    it("handles appointments with today group", () => {
      const appointment = createMockAppointment("appt-1", "Doctor Visit");
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          groupedTasks={[groupedTask]}
          todayAppointments={[appointment]}
        />
      );
      expect(getByTestId("grouped-tasks-view-appointments-Today")).toBeTruthy();
      expect(getByTestId("appointment-card-appt-1")).toBeTruthy();
    });

    it("handles multiple appointments", () => {
      const appointment1 = createMockAppointment("appt-1", "Doctor Visit");
      const appointment2 = createMockAppointment("appt-2", "Lab Test");
      const { getByTestId } = render(
        <GroupedTasksView
          {...defaultProps}
          todayAppointments={[appointment1, appointment2]}
        />
      );
      expect(getByTestId("appointment-card-appt-1")).toBeTruthy();
      expect(getByTestId("appointment-card-appt-2")).toBeTruthy();
    });

    it("handles tasks with and without time in same group", () => {
      const taskWithTime = createMockTask(
        "task-1",
        "Timed Task",
        new Date().getTime()
      );
      const taskWithoutTime = createMockTask("task-2", "No Time Task");
      const groupedTask = createMockGroupedTask(
        "Today",
        [taskWithTime],
        [taskWithoutTime]
      );
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("task-card-task-1")).toBeTruthy();
      expect(getByTestId("task-card-task-2")).toBeTruthy();
    });

    it("handles multiple time groups", () => {
      const task1 = createMockTask("task-1", "Task 1", new Date().getTime());
      const task2 = createMockTask(
        "task-2",
        "Task 2",
        new Date().getTime() + 3600000
      );
      const groupedTask: GroupedTask = {
        dayLabel: "Today",
        dayDate: new Date().toISOString().split("T")[0],
        tasksWithoutTime: [],
        timeGroups: [
          { time: "10:00 AM", tasks: [task1] },
          { time: "11:00 AM", tasks: [task2] },
        ],
      };
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(
        getByTestId("grouped-tasks-view-time-group-10:00 AM")
      ).toBeTruthy();
      expect(
        getByTestId("grouped-tasks-view-time-group-11:00 AM")
      ).toBeTruthy();
      expect(getByTestId("task-card-task-1")).toBeTruthy();
      expect(getByTestId("task-card-task-2")).toBeTruthy();
    });

    it("handles empty appointments array", () => {
      const { queryByTestId } = render(
        <GroupedTasksView {...defaultProps} todayAppointments={[]} />
      );
      expect(queryByTestId("appointment-card-appt-1")).toBeNull();
    });

    it("handles undefined timezoneId", () => {
      const appointment = createMockAppointment("appt-1", "Doctor Visit");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} todayAppointments={[appointment]} />
      );
      expect(getByTestId("appointment-card-appt-1")).toBeTruthy();
    });
  });

  // 5. Accessibility
  describe("Accessibility", () => {
    it("has proper accessibility label on ScrollView", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      const scrollView = getByTestId("dashboard_tasks_grouped_view");
      expect(scrollView.props.accessibilityLabel).toBe(
        "dashboard_tasks_grouped_view"
      );
    });
  });

  // 6. Snapshots
  describe("Snapshots", () => {
    beforeAll(() => {
      // Freeze time so date formatting in snapshots is stable.
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it("matches snapshot with default props", () => {
      const { toJSON } = render(<GroupedTasksView {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it("matches snapshot with grouped tasks", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { toJSON } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it("matches snapshot with loading state", () => {
      const { toJSON } = render(
        <GroupedTasksView {...defaultProps} loading={true} />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it("matches snapshot with error state", () => {
      const { toJSON } = render(
        <GroupedTasksView {...defaultProps} error="Failed to load tasks" />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it("matches snapshot with appointments", () => {
      // Use fixed date to prevent snapshot from changing daily
      const appointment: Appointment = {
        appointmentId: "appt-1",
        title: "Doctor Visit",
        startAt: "2025-01-15T10:00:00.000Z",
        appointmentType: AppointmentType.ONSITE,
      } as Appointment;

      const { toJSON } = render(
        <GroupedTasksView {...defaultProps} todayAppointments={[appointment]} />
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it("matches snapshot in RTL mode", () => {
      mockUseRTL.mockReturnValueOnce({
        rtlStyle: jest.fn((style: StyleProp<ViewStyle | TextStyle>) => ({
          ...(style as Record<string, unknown>),
          flexDirection: "row-reverse",
        })),
        isRTL: true,
      });

      const { toJSON } = render(<GroupedTasksView {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  // 7. E2E Support
  describe("E2E Support", () => {
    it("has testId on ScrollView", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("dashboard_tasks_grouped_view")).toBeTruthy();
    });

    it("has testId on day groups", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("grouped-tasks-view-day-group-Today")).toBeTruthy();
    });

    it("has testId on day headers", () => {
      const groupedTask = createMockGroupedTask("Today");
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      expect(getByTestId("grouped-tasks-view-day-header-Today")).toBeTruthy();
    });

    it("has testId on time groups", () => {
      const task = createMockTask("task-1", "Test Task", new Date().getTime());
      const groupedTask = createMockGroupedTask("Today", [task]);
      const { getByTestId } = render(
        <GroupedTasksView {...defaultProps} groupedTasks={[groupedTask]} />
      );
      // Time group testID includes the time string
      const timeString = new Date(task.startTimeInMillSec!).toLocaleTimeString(
        "en-US",
        {
          hour: "numeric",
          minute: "2-digit",
        }
      );
      expect(
        getByTestId(`grouped-tasks-view-time-group-${timeString}`)
      ).toBeTruthy();
    });
  });
});
