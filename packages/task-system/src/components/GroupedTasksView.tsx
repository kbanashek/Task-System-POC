import { AppointmentCard } from "@components/AppointmentCard";
import { TaskCard } from "@components/TaskCard";
import { TranslatedText } from "@components/TranslatedText";
import { AppColors } from "@constants/AppColors";
import { AppFonts } from "@constants/AppFonts";
import { TestIds } from "@constants/testIds";
import { GroupedTask } from "@hooks/useGroupedTasks";
import { Appointment } from "@task-types/Appointment";
import { Task } from "@task-types/Task";
import { useTaskTranslation } from "@translations/index";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface GroupedTasksViewProps {
  groupedTasks: GroupedTask[];
  loading: boolean;
  error: string | null;
  onTaskPress?: (task: Task) => void;
  onDelete?: (id: string) => void;
  hideDateHeader?: boolean; // If true, don't show the date header for today's tasks
  todayAppointments?: Appointment[]; // Appointments for today to display with tasks
  onAppointmentPress?: (appointment: Appointment) => void;
  appointmentTimezoneId?: string;
}

/**
 * A view component for displaying grouped tasks.
 *
 * @param groupedTasks - The grouped tasks to display
 * @param loading - Whether the tasks are loading
 * @param error - The error message to display
 * @param onTaskPress - Callback function when a task is pressed
 * @param onDelete - Callback function when a task is deleted
 * @param hideDateHeader - Whether to hide the date header for today's tasks
 * @param todayAppointments - The appointments for today to display with tasks
 * @param onAppointmentPress - Callback function when an appointment is pressed
 * @param appointmentTimezoneId - The timezone ID to use for formatting the appointment time
 * @returns A view component with the provided configuration
 */
export const GroupedTasksView: React.FC<GroupedTasksViewProps> = ({
  groupedTasks,
  loading,
  error,
  onTaskPress,
  onDelete,
  hideDateHeader = false,
  todayAppointments = [],
  onAppointmentPress,
  appointmentTimezoneId,
}) => {
  const { currentLanguage } = useTaskTranslation();
  const loggerRef = React.useRef(getServiceLogger("GroupedTasksView"));
  const prevLanguageRef = React.useRef<string>(currentLanguage);
  const componentRenderCountRef = React.useRef<number>(0);

  // Log EVERY render to see if component is re-rendering
  React.useEffect(() => {
    componentRenderCountRef.current += 1;
    loggerRef.current.debug(
      "GroupedTasksView rendered",
      {
        renderCount: componentRenderCountRef.current,
        currentLanguage,
        previousLanguage: prevLanguageRef.current,
        languageChanged: prevLanguageRef.current !== currentLanguage,
      },
      undefined,
      "📋"
    );
  });

  // Log when language changes
  React.useEffect(() => {
    const languageChanged = prevLanguageRef.current !== currentLanguage;
    const taskCount = groupedTasks.reduce(
      (sum, group) =>
        sum +
        group.tasksWithoutTime.length +
        group.timeGroups.reduce((s, tg) => s + tg.tasks.length, 0),
      0
    );
    loggerRef.current.debug(
      "GroupedTasksView language changed",
      {
        currentLanguage,
        previousLanguage: prevLanguageRef.current,
        languageChanged,
        taskCount,
        scrollViewKey: `scroll-${currentLanguage}`,
        willRemountScrollView: languageChanged,
      },
      undefined,
      "📋"
    );
    prevLanguageRef.current = currentLanguage;
  }, [currentLanguage, groupedTasks]);

  if (loading) {
    return (
      <View
        style={[styles.centerContainer, styles.fill]}
        testID="grouped-tasks-view-loading"
      >
        <ActivityIndicator
          size="large"
          color={AppColors.CIBlue}
          testID="grouped-tasks-view-loading-spinner"
        />
        <TranslatedText
          text="Loading tasks..."
          style={styles.loadingText}
          testID="grouped-tasks-view-loading-text"
        />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.centerContainer, styles.fill]}
        testID="grouped-tasks-view-error"
      >
        <Text style={styles.errorText} testID="grouped-tasks-view-error-text">
          {error}
        </Text>
      </View>
    );
  }

  // Show appointments for today even if there are no tasks
  const hasTodayGroup = groupedTasks.some(g => g.dayLabel === "Today");
  const shouldShowAppointments = todayAppointments.length > 0;

  if (groupedTasks.length === 0 && !shouldShowAppointments) {
    return (
      <View
        style={[styles.centerContainer, styles.fill]}
        testID="grouped-tasks-view-empty"
      >
        <TranslatedText
          text="No tasks available."
          style={styles.emptyText}
          testID="grouped-tasks-view-empty-text"
        />
      </View>
    );
  }

  return (
    <ScrollView
      key={currentLanguage} // force re-render on language change
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID={TestIds.dashboardTasksGroupedView}
      accessibilityLabel={TestIds.dashboardTasksGroupedView}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      {/* Show appointments for today if they exist and there's no "Today" task group */}
      {shouldShowAppointments && !hasTodayGroup && (
        <View
          style={styles.dayGroup}
          testID="grouped-tasks-view-appointments-only"
        >
          <View style={styles.dayHeader}>
            <TranslatedText text="Today" style={styles.dayLabel} />
            <Text style={styles.dayDate}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.appointmentsContainer}>
            {todayAppointments.map(appointment => (
              <AppointmentCard
                key={appointment.appointmentId}
                appointment={appointment}
                onPress={onAppointmentPress}
                timezoneId={appointmentTimezoneId}
              />
            ))}
          </View>
        </View>
      )}

      {groupedTasks.map(dayGroup => {
        const isToday = dayGroup.dayLabel === "Today";
        const showAppointments = isToday && todayAppointments.length > 0;

        return (
          <View
            key={`${dayGroup.dayLabel}-${currentLanguage}`}
            style={styles.dayGroup}
            testID={`grouped-tasks-view-day-group-${dayGroup.dayLabel}`}
          >
            {/* Date Header - hide if hideDateHeader is true and it's "Today" */}
            {!(hideDateHeader && dayGroup.dayLabel === "Today") && (
              <View
                style={styles.dayHeader}
                testID={`grouped-tasks-view-day-header-${dayGroup.dayLabel}`}
              >
                <TranslatedText
                  text={dayGroup.dayLabel}
                  style={styles.dayLabel}
                />
                {/* Only show date next to "Today" or "Tomorrow" */}
                {(dayGroup.dayLabel === "Today" ||
                  dayGroup.dayLabel === "Tomorrow") && (
                  <Text style={styles.dayDate}>{dayGroup.dayDate}</Text>
                )}
              </View>
            )}

            {/* Appointments for Today - show first */}
            {showAppointments ? (
              <View
                style={styles.appointmentsContainer}
                testID={`grouped-tasks-view-appointments-${dayGroup.dayLabel}`}
              >
                {todayAppointments.length === 0 ? (
                  <Text style={styles.errorText}>
                    No appointments to display (array is empty)
                  </Text>
                ) : (
                  todayAppointments.map(appointment => {
                    return (
                      <AppointmentCard
                        key={appointment.appointmentId}
                        appointment={appointment}
                        onPress={onAppointmentPress}
                        timezoneId={appointmentTimezoneId}
                      />
                    );
                  })
                )}
              </View>
            ) : null}

            {/* Tasks without due time (episodic tasks) - show first */}
            <View key={`tasks-without-time-${currentLanguage}`}>
              {dayGroup.tasksWithoutTime.map(task => (
                <TaskCard
                  key={`${task.id}-${currentLanguage}`}
                  task={task}
                  simple={false}
                  onPress={onTaskPress}
                  onDelete={onDelete}
                />
              ))}
            </View>

            {/* Tasks grouped by time (scheduled tasks) - show after episodic tasks */}
            {dayGroup.timeGroups.map(timeGroup => (
              <View
                key={`${timeGroup.time}-${currentLanguage}`}
                style={styles.timeGroup}
                testID={`grouped-tasks-view-time-group-${timeGroup.time}`}
              >
                <View
                  style={styles.dueByRow}
                  testID={`grouped-tasks-view-due-by-${timeGroup.time}`}
                >
                  <TranslatedText text="DUE BY" style={styles.dueByHeader} />
                  <Text style={styles.dueByTime}>{timeGroup.time}</Text>
                </View>
                <View
                  key={`time-group-tasks-${timeGroup.time}-${currentLanguage}`}
                >
                  {timeGroup.tasks.map(task => (
                    <TaskCard
                      key={`${task.id}-${currentLanguage}`}
                      task={task}
                      simple={false}
                      onPress={onTaskPress}
                      onDelete={onDelete}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  dayGroup: {
    marginBottom: 4,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
    gap: 12,
  },
  dayLabel: {
    ...AppFonts.heading,
    color: AppColors.CINavy,
  },
  dayDate: {
    ...AppFonts.heading,
    color: AppColors.CINavy,
  },
  timeGroup: {
    marginBottom: 16,
  },
  dueByRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 12,
  },
  dueByHeader: {
    ...AppFonts.label,
    color: AppColors.CINavy,
    textTransform: "uppercase",
  },
  dueByTime: {
    ...AppFonts.label,
    color: AppColors.CINavy,
  },
  centerContainer: {
    padding: 32,
    alignItems: "center",
  },
  loadingText: {
    ...AppFonts.small,
    marginTop: 12,
    color: AppColors.darkGray,
  },
  errorText: {
    ...AppFonts.small,
    color: AppColors.errorRed,
    textAlign: "center",
  },
  emptyText: {
    ...AppFonts.body,
    color: AppColors.mediumDarkGray,
    textAlign: "center",
  },
  appointmentsContainer: {
    marginBottom: 16,
  },
});
