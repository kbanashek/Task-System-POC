import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useTaskContainer } from "@hooks/useTaskContainer";
import { Task, TaskStatus, TaskType } from "@task-types/Task";
import {
  Appointment,
  AppointmentData,
  AppointmentStatus,
  AppointmentType,
} from "@task-types/Appointment";
import { Alert } from "react-native";

// Mock react-navigation
jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(),
}));

// Mock hooks
jest.mock("@hooks/useTaskList", () => ({
  useTaskList: jest.fn(),
}));

jest.mock("@hooks/useGroupedTasks", () => ({
  useGroupedTasks: jest.fn(),
}));

jest.mock("@hooks/useAppointmentList", () => ({
  useAppointmentList: jest.fn(),
}));

jest.mock("@utils/parsers/appointmentParser", () => ({
  groupAppointmentsByDate: jest.fn(),
}));

jest.mock("@services/NavigationService", () => ({
  navigationService: {
    navigateToAppointmentDetails: jest.fn(),
  },
}));

import { useNavigation } from "@react-navigation/native";
import { useTaskList } from "@hooks/useTaskList";
import { useGroupedTasks } from "@hooks/useGroupedTasks";
import { useAppointmentList } from "@hooks/useAppointmentList";
import { groupAppointmentsByDate } from "@utils/parsers/appointmentParser";
import { navigationService } from "@services/NavigationService";

describe("useTaskContainer", () => {
  const mockNavigate = jest.fn();
  const mockUseNavigation = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const mockUseTaskList = useTaskList as jest.MockedFunction<
    typeof useTaskList
  >;
  const mockUseGroupedTasks = useGroupedTasks as jest.MockedFunction<
    typeof useGroupedTasks
  >;
  const mockUseAppointmentList = useAppointmentList as jest.MockedFunction<
    typeof useAppointmentList
  >;
  const mockGroupAppointmentsByDate =
    groupAppointmentsByDate as jest.MockedFunction<
      typeof groupAppointmentsByDate
    >;

  const mockTasks: Task[] = [
    {
      id: "1",
      pk: "TASK-1",
      sk: "SK-1",
      title: "Task 1",
      description: "Description 1",
      status: TaskStatus.OPEN,
      taskType: TaskType.SCHEDULED,
      startTimeInMillSec: Date.now(),
      expireTimeInMillSec: Date.now() + 86400000,
      entityId: "ACTIVITY-1",
    },
  ];

  const mockGroupedTasks = [
    {
      dayLabel: "Today",
      dayDate: "Mon, Jan 1",
      tasksWithoutTime: [],
      timeGroups: [{ time: "9:00 AM", tasks: mockTasks }],
    },
  ];

  const mockAppointments: Appointment[] = [
    {
      appointmentId: "APT-1",
      eventId: "EVENT-1",
      patientId: "PATIENT-1",
      siteId: "SITE-1",
      title: "Appointment 1",
      startAt: new Date().toISOString(),
      endAt: new Date().toISOString(),
      appointmentType: AppointmentType.ONSITE,
      status: AppointmentStatus.SCHEDULED,
      isDeleted: 0,
      rescheduled: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      __typename: "Appointment",
    },
  ];

  const mockAppointmentData: AppointmentData = {
    clinicPatientAppointments: {
      clinicAppointments: {
        items: [],
      },
    },
    siteTimezoneId: "America/New_York",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as any);
    mockUseTaskList.mockReturnValue({
      tasks: mockTasks,
      loading: false,
      error: null,
      isSynced: true,
      isOnline: true,
      handleDeleteTask: jest.fn(),
      retryLoading: jest.fn(),
      clearDataStore: jest.fn(),
      refreshTasks: jest.fn(),
    });
    mockUseGroupedTasks.mockReturnValue(mockGroupedTasks as any);
    mockUseAppointmentList.mockReturnValue({
      appointments: mockAppointments,
      appointmentData: mockAppointmentData,
      loading: false,
      error: null,
      refreshAppointments: jest.fn().mockResolvedValue(undefined),
    });
    mockGroupAppointmentsByDate.mockReturnValue([
      {
        date: "2025-12-23",
        dateLabel: "Today",
        appointments: mockAppointments,
      },
    ]);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  describe("initialization", () => {
    it("returns grouped tasks from useGroupedTasks", () => {
      const { result } = renderHook(() => useTaskContainer());
      expect(result.current.groupedTasks).toEqual(mockGroupedTasks);
    });

    it("returns loading state from useTaskList", () => {
      mockUseTaskList.mockReturnValue({
        tasks: [],
        loading: true,
        error: null,
        isSynced: false,
        isOnline: true,
        handleDeleteTask: jest.fn(),
        retryLoading: jest.fn(),
        clearDataStore: jest.fn(),
        refreshTasks: jest.fn(),
      });
      const { result } = renderHook(() => useTaskContainer());
      expect(result.current.loading).toBe(true);
    });

    it("returns error state from useTaskList", () => {
      mockUseTaskList.mockReturnValue({
        tasks: [],
        loading: false,
        error: "Error message",
        isSynced: false,
        isOnline: true,
        handleDeleteTask: jest.fn(),
        retryLoading: jest.fn(),
        clearDataStore: jest.fn(),
        refreshTasks: jest.fn(),
      });
      const { result } = renderHook(() => useTaskContainer());
      expect(result.current.error).toBe("Error message");
    });

    it("calls refreshAppointments on mount", async () => {
      const refreshAppointments = jest.fn().mockResolvedValue(undefined);
      mockUseAppointmentList.mockReturnValue({
        appointments: [],
        appointmentData: null,
        loading: false,
        error: null,
        refreshAppointments,
      });
      renderHook(() => useTaskContainer());
      await waitFor(() => {
        expect(refreshAppointments).toHaveBeenCalled();
      });
    });
  });

  describe("todayAppointments", () => {
    it("returns appointments from Today group", () => {
      const { result } = renderHook(() => useTaskContainer());
      expect(result.current.todayAppointments).toEqual(mockAppointments);
    });

    it("returns all appointments if Today group not found", () => {
      mockGroupAppointmentsByDate.mockReturnValue([
        {
          date: "2025-12-24",
          dateLabel: "Tomorrow",
          appointments: [],
        },
      ]);
      const { result } = renderHook(() => useTaskContainer());
      expect(result.current.todayAppointments).toEqual(mockAppointments);
    });
  });

  describe("appointmentTimezoneId", () => {
    it("returns timezone ID from appointment data", () => {
      const { result } = renderHook(() => useTaskContainer());
      expect(result.current.appointmentTimezoneId).toBe("America/New_York");
    });

    it("returns undefined when appointment data is null", () => {
      mockUseAppointmentList.mockReturnValue({
        appointments: [],
        appointmentData: null,
        loading: false,
        error: null,
        refreshAppointments: jest.fn().mockResolvedValue(undefined),
      });
      const { result } = renderHook(() => useTaskContainer());
      expect(result.current.appointmentTimezoneId).toBeUndefined();
    });
  });

  describe("handleTaskPress", () => {
    it("navigates to questions screen when task has entityId", () => {
      const { result } = renderHook(() => useTaskContainer());
      const task: Task = {
        id: "1",
        pk: "TASK-1",
        sk: "SK-1",
        title: "Task 1",
        description: "Description 1",
        status: TaskStatus.OPEN,
        taskType: TaskType.SCHEDULED,
        startTimeInMillSec: Date.now(),
        expireTimeInMillSec: Date.now() + 86400000,
        entityId: "ACTIVITY-1",
      };

      act(() => {
        result.current.handleTaskPress(task);
      });

      expect(mockNavigate).toHaveBeenCalledWith("TaskQuestions", {
        taskId: task.id,
        entityId: task.entityId,
      });
    });

    it("navigates to questions screen with extracted id when task has ActivityRef chain entityId", () => {
      const { result } = renderHook(() => useTaskContainer());
      const task: Task = {
        id: "1",
        pk: "TASK-1",
        sk: "SK-1",
        title: "Task 1",
        description: "Description 1",
        status: TaskStatus.OPEN,
        taskType: TaskType.SCHEDULED,
        startTimeInMillSec: Date.now(),
        expireTimeInMillSec: Date.now() + 86400000,
        entityId:
          "ActivityRef#Arm.111#ActivityGroup.222#Activity.ad93b50d-7d49-4128-8a59-91275e77f3c8",
      };

      act(() => {
        result.current.handleTaskPress(task);
      });

      expect(mockNavigate).toHaveBeenCalledWith("TaskQuestions", {
        taskId: task.id,
        entityId: "ad93b50d-7d49-4128-8a59-91275e77f3c8",
      });
    });

    it("shows alert when task has no entityId", () => {
      const { result } = renderHook(() => useTaskContainer());
      const task: Task = {
        id: "1",
        pk: "TASK-1",
        sk: "SK-1",
        title: "Task 1",
        description: "Description 1",
        status: TaskStatus.OPEN,
        taskType: TaskType.SCHEDULED,
        startTimeInMillSec: Date.now(),
        expireTimeInMillSec: Date.now() + 86400000,
        entityId: null,
      };

      act(() => {
        result.current.handleTaskPress(task);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "No Questions Available",
        expect.stringContaining(
          "This task does not have an associated activity"
        ),
        [{ text: "OK", style: "default" }]
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("handleAppointmentPress", () => {
    it("calls NavigationService to handle appointment navigation", () => {
      const { result } = renderHook(() => useTaskContainer());
      const appointment = mockAppointments[0];

      act(() => {
        result.current.handleAppointmentPress(appointment);
      });

      expect(
        navigationService.navigateToAppointmentDetails
      ).toHaveBeenCalledWith(
        appointment,
        mockAppointmentData.siteTimezoneId,
        expect.anything() // navigation object
      );
    });
  });

  describe("handleDeleteTask", () => {
    it("delegates to useTaskList handleDeleteTask", async () => {
      const handleDeleteTask = jest.fn().mockResolvedValue(undefined);
      mockUseTaskList.mockReturnValue({
        tasks: mockTasks,
        loading: false,
        error: null,
        isSynced: true,
        isOnline: true,
        handleDeleteTask,
        retryLoading: jest.fn(),
        clearDataStore: jest.fn(),
        refreshTasks: jest.fn(),
      });
      const { result } = renderHook(() => useTaskContainer());

      await act(async () => {
        await result.current.handleDeleteTask("1");
      });

      expect(handleDeleteTask).toHaveBeenCalledWith("1");
    });
  });
});
