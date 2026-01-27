export { TaskActivityModule } from "./modules/TaskActivityModule";

// Optional: expose internal building blocks for LX teams if they want to compose.
export { GroupedTasksView } from "@components/GroupedTasksView";
export { TaskContainer } from "@components/TaskContainer";

// App-level components (harness/test app use)
export { GlobalHeader } from "@components/GlobalHeader";
export { LanguageSelector } from "@components/LanguageSelector";
export { NavigationMenu } from "@components/NavigationMenu";
export { NetworkStatusIndicator } from "@components/NetworkStatusIndicator";
export { TranslatedText } from "@components/TranslatedText";

// Runtime initialization (LX-style: host owns Amplify.configure)
export { initTaskSystem, getTaskSystemConfig } from "@runtime/taskSystem";
export type { TaskSystemInitOptions } from "@runtime/taskSystem";

// Fixture import (LX-owned disk data -> DataStore/AsyncStorage materialization)
export type {
  ImportTaskSystemFixtureOptions,
  ImportTaskSystemFixtureResult,
  TaskSystemFixture,
  TaskSystemFixtureVersion,
} from "@fixtures/TaskSystemFixture";
export { FixtureImportService } from "@services/FixtureImportService";

// Question flow + question components
export * from "@components/questions";

// Reusable UI building blocks
export * from "@components/ui";

// Export all services - single source of truth
export { ActivityService } from "@services/ActivityService";
export { AppointmentService } from "@services/AppointmentService";
export { ConflictResolution } from "@services/ConflictResolution";
export { DataPointService } from "@services/DataPointService";
export {
  ImageStorageService,
  getImageStorageService,
} from "@services/ImageStorageService";
export type {
  UploadImageOptions,
  UploadImageResult,
  DownloadImageOptions,
  DownloadImageResult,
} from "@services/ImageStorageService";
export {
  LoggingService,
  getLoggingService,
  initializeLoggingService,
} from "@services/LoggingService";
export { QuestionService } from "@services/QuestionService";
export { SeededDataCleanupService } from "@services/SeededDataCleanupService";
export { TaskAnswerService } from "@services/TaskAnswerService";
export { TaskHistoryService } from "@services/TaskHistoryService";
export { TaskResultService } from "@services/TaskResultService";
export { TaskService } from "@services/TaskService";
export { TempAnswerSyncService } from "@services/TempAnswerSyncService";
export { TranslationMemoryService } from "@services/TranslationMemoryService";
export {
  TranslationService,
  getTranslationService,
} from "@services/TranslationService";
export type { LoggingConfig } from "@services/logging/types";
export * from "@services/translationTypes";

// Export all hooks - single source of truth
export { useActivity } from "@hooks/useActivity";
export { useActivityData } from "@hooks/useActivityData";
export { useActivityList } from "@hooks/useActivityList";
export {
  DataStoreEventType,
  NetworkStatus,
  SyncState,
  useAmplifyState,
} from "@hooks/useAmplifyState";
export type { AmplifyState } from "@hooks/useAmplifyState";
export { useAnswerManagement } from "@hooks/useAnswerManagement";
export { useAppointmentList } from "@hooks/useAppointmentList";
export { useColorScheme } from "@hooks/useColorScheme";
export { useDataPointInstance } from "@hooks/useDataPointInstance";
export { useDataPointList } from "@hooks/useDataPointList";
export { useGroupedTasks } from "@hooks/useGroupedTasks";
export { useNetworkStatus } from "@hooks/useNetworkStatus";
export { useQuestionList } from "@hooks/useQuestionList";
export { useQuestionNavigation } from "@hooks/useQuestionNavigation";
export { useQuestionScreenButtons } from "@hooks/useQuestionScreenButtons";
export { useQuestionSubmission } from "@hooks/useQuestionSubmission";
export { useQuestionValidation } from "@hooks/useQuestionValidation";
export { useQuestionsScreen } from "@hooks/useQuestionsScreen";
export { useRTL } from "@hooks/useRTL";
export { useTaskAnswer } from "@hooks/useTaskAnswer";
export { useTaskAnswerList } from "@hooks/useTaskAnswerList";
export { useTaskContainer } from "@hooks/useTaskContainer";
export { useTaskFilters } from "@hooks/useTaskFilters";
export { useTaskForm } from "@hooks/useTaskForm";
export { useTaskHistoryList } from "@hooks/useTaskHistoryList";
export { useTaskList } from "@hooks/useTaskList";
export { useTaskResultList } from "@hooks/useTaskResultList";
export { useTaskUpdate } from "@hooks/useTaskUpdate";
export { useThemeColor } from "@hooks/useThemeColor";
export { useTranslatedText } from "@hooks/useTranslatedText";

// Export types
export type { GroupedTask } from "@hooks/useGroupedTasks";
export type { Activity } from "@task-types/Activity";
export type {
  ActivityConfig,
  ParsedElement,
  ParsedScreen,
} from "@task-types/ActivityConfig";
export { AppointmentStatus, AppointmentType } from "@task-types/Appointment";
export type {
  Appointment,
  AppointmentData,
  GroupedAppointment,
} from "@task-types/Appointment";
export type { DataPoint } from "@task-types/DataPoint";
export type { Question } from "@task-types/Question";
export type { AnswerValue } from "@task-types/AnswerValue";
export { TaskStatus, TaskType } from "@task-types/Task";
export type {
  CreateTaskInput,
  Task,
  TaskFilters,
  UpdateTaskInput,
} from "@task-types/Task";
export type { TaskAnswer } from "@task-types/TaskAnswer";
export type { TaskHistory } from "@task-types/TaskHistory";
export type { TaskResult } from "@task-types/TaskResult";
export {
  QuestionType,
  ValidationType,
} from "@task-types/activity-config-enums";

// Temp answer (LX-integrated) types
// TempAnswerSync types removed - DataStore handles sync automatically

// Activity parsing types/utils
export {
  getDisplayProperty,
  parseActivityConfig,
} from "@utils/parsers/activityParser";
export type { ParsedActivityData } from "@utils/parsers/activityParser";
export {
  getDeviceId,
  getLogPrefix,
  logWithDevice,
  logErrorWithDevice,
} from "@utils/logging/deviceLogger";
export { getPlatformIcon } from "@utils/icons/platformIcons";

// Export utils commonly used by host apps
export {
  formatDateLabel,
  formatTime,
  formatTimeRange,
  getTimezoneAbbreviation,
  groupAppointmentsByDate,
  parseAppointmentData,
} from "@utils/parsers/appointmentParser";

// Export constants
export { AWSErrorName } from "@constants/awsErrors";
export type { AWSErrorNameType } from "@constants/awsErrors";
export { ModelName } from "@constants/modelNames";
export type { ModelNameType } from "@constants/modelNames";
export { OperationSource } from "@constants/operationSource";
export type { OperationSourceType } from "@constants/operationSource";

// Export contexts
export { AmplifyProvider, useAmplify } from "@contexts/AmplifyContext";

// Translation system (i18next-based - new architecture)
export {
  TranslationProvider,
  addTranslationBundle,
  getDefaultNamespace,
  getTranslationKey,
  initializeTranslations,
  isRTLMode,
  loadDefaultTranslations,
  safeTranslate,
  useTaskTranslation,
} from "@translations/index";
export type {
  ActivityTranslation,
  TranslationBundle,
  TranslationConfig,
  TranslationOptions,
} from "@translations/index";
// Note: SUPPORTED_LANGUAGES, isRTL, and LanguageCode are already exported via export * from "@services/translationTypes" on line 56

// Legacy translation system (deprecated - use new i18next-based system)
// Keep old exports for backward compatibility during migration
/**
 * @deprecated Use TranslationProvider and useTaskTranslation from translations/ instead
 */
export {
  TranslationProvider as TranslationProviderLegacy,
  useTranslation as useTranslationLegacy,
} from "@contexts/TranslationContext";

// Also export old useTranslation for backward compatibility (harness components)
/**
 * @deprecated Use useTaskTranslation from translations/ instead
 */
export { useTranslation } from "@contexts/TranslationContext";
