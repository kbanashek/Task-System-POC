import {
  ModelInit,
  MutableModel,
  __modelMeta__,
  ManagedIdentifier,
} from "@aws-amplify/datastore";
// @ts-ignore
import { LazyLoading, LazyLoadingDisabled } from "@aws-amplify/datastore";

export enum TaskType {
  SCHEDULED = "SCHEDULED",
  TIMED = "TIMED",
  EPISODIC = "EPISODIC",
}

export enum TaskStatus {
  OPEN = "OPEN",
  VISIBLE = "VISIBLE",
  STARTED = "STARTED",
  INPROGRESS = "INPROGRESS",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
  RECALLED = "RECALLED",
}

type EagerTask = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Task, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskInstanceId?: string | null;
  readonly title: string;
  readonly description?: string | null;
  readonly startTime?: string | null;
  readonly startTimeInMillSec?: number | null;
  readonly expireTimeInMillSec?: number | null;
  readonly endTimeInMillSec?: number | null;
  readonly endTime?: string | null;
  readonly dayOffset?: number | null;
  readonly endDayOffset?: number | null;
  readonly taskType: TaskType | keyof typeof TaskType;
  readonly status: TaskStatus | keyof typeof TaskStatus;
  readonly showBeforeStart?: boolean | null;
  readonly allowEarlyCompletion?: boolean | null;
  readonly allowLateCompletion?: boolean | null;
  readonly allowLateEdits?: boolean | null;
  readonly anchors?: string | null;
  readonly anchorDayOffset?: number | null;
  readonly actions?: string | null;
  readonly entityId?: string | null;
  readonly activityIndex?: number | null;
  readonly activityAnswer?: string | null;
  readonly activityResponse?: string | null;
  readonly syncState?: number | null;
  readonly syncStateTaskAnswer?: number | null;
  readonly syncStateTaskResult?: number | null;
  readonly syncStatus?: string | null;
  readonly hashKey?: string | null;
  readonly occurrenceHashKey?: string | null;
  readonly occurrenceParentHashKey?: string | null;
  readonly parentTaskInstanceId?: string | null;
  readonly tciSk?: string | null;
  readonly studyVersion?: string | null;
  readonly studyStatus?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyTask = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Task, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskInstanceId?: string | null;
  readonly title: string;
  readonly description?: string | null;
  readonly startTime?: string | null;
  readonly startTimeInMillSec?: number | null;
  readonly expireTimeInMillSec?: number | null;
  readonly endTimeInMillSec?: number | null;
  readonly endTime?: string | null;
  readonly dayOffset?: number | null;
  readonly endDayOffset?: number | null;
  readonly taskType: TaskType | keyof typeof TaskType;
  readonly status: TaskStatus | keyof typeof TaskStatus;
  readonly showBeforeStart?: boolean | null;
  readonly allowEarlyCompletion?: boolean | null;
  readonly allowLateCompletion?: boolean | null;
  readonly allowLateEdits?: boolean | null;
  readonly anchors?: string | null;
  readonly anchorDayOffset?: number | null;
  readonly actions?: string | null;
  readonly entityId?: string | null;
  readonly activityIndex?: number | null;
  readonly activityAnswer?: string | null;
  readonly activityResponse?: string | null;
  readonly syncState?: number | null;
  readonly syncStateTaskAnswer?: number | null;
  readonly syncStateTaskResult?: number | null;
  readonly syncStatus?: string | null;
  readonly hashKey?: string | null;
  readonly occurrenceHashKey?: string | null;
  readonly occurrenceParentHashKey?: string | null;
  readonly parentTaskInstanceId?: string | null;
  readonly tciSk?: string | null;
  readonly studyVersion?: string | null;
  readonly studyStatus?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type Task = LazyLoading extends LazyLoadingDisabled
  ? EagerTask
  : LazyTask;

export declare const Task: (new (init: ModelInit<Task>) => Task) & {
  copyOf(
    source: Task,
    mutator: (draft: MutableModel<Task>) => MutableModel<Task> | void
  ): Task;
};

type EagerQuestion = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Question, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly question: string;
  readonly questionId: string;
  readonly questionText?: string | null;
  readonly questionEnText?: string | null;
  readonly friendlyName: string;
  readonly answer?: string | null;
  readonly controlType: string;
  readonly type?: string | null;
  readonly validations?: string | null;
  readonly codedSelection?: string | null;
  readonly answerId?: string | null;
  readonly answersValue?: string | null;
  readonly answerEnText?: string | null;
  readonly answerCodedValue?: string | null;
  readonly answersImages?: string | null;
  readonly value?: string | null;
  readonly codedValue?: number | null;
  readonly imageS3Key?: string | null;
  readonly multiSelectOverride?: string | null;
  readonly version: number;
  readonly index: number;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyQuestion = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Question, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly question: string;
  readonly questionId: string;
  readonly questionText?: string | null;
  readonly questionEnText?: string | null;
  readonly friendlyName: string;
  readonly answer?: string | null;
  readonly controlType: string;
  readonly type?: string | null;
  readonly validations?: string | null;
  readonly codedSelection?: string | null;
  readonly answerId?: string | null;
  readonly answersValue?: string | null;
  readonly answerEnText?: string | null;
  readonly answerCodedValue?: string | null;
  readonly answersImages?: string | null;
  readonly value?: string | null;
  readonly codedValue?: number | null;
  readonly imageS3Key?: string | null;
  readonly multiSelectOverride?: string | null;
  readonly version: number;
  readonly index: number;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type Question = LazyLoading extends LazyLoadingDisabled
  ? EagerQuestion
  : LazyQuestion;

export declare const Question: (new (init: ModelInit<Question>) => Question) & {
  copyOf(
    source: Question,
    mutator: (draft: MutableModel<Question>) => MutableModel<Question> | void
  ): Question;
};

type EagerActivity = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Activity, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly name?: string | null;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly type?: string | null;
  readonly activityGroups?: string | null;
  readonly layouts?: string | null;
  readonly rules?: string | null;
  readonly resumable?: boolean | null;
  readonly transcribable?: boolean | null;
  readonly respondentType?: string | null;
  readonly progressBar?: boolean | null;
  readonly displayHistoryDetail?: string | null;
  readonly fontFamily?: string | null;
  readonly fontWeight?: number | null;
  readonly fontColor?: string | null;
  readonly fontSize?: number | null;
  readonly lineHeight?: string | null;
  readonly s3Files?: string | null;
  readonly externalContent?: string | null;
  readonly calculatedValues?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyActivity = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<Activity, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly name?: string | null;
  readonly title?: string | null;
  readonly description?: string | null;
  readonly type?: string | null;
  readonly activityGroups?: string | null;
  readonly layouts?: string | null;
  readonly rules?: string | null;
  readonly resumable?: boolean | null;
  readonly transcribable?: boolean | null;
  readonly respondentType?: string | null;
  readonly progressBar?: boolean | null;
  readonly displayHistoryDetail?: string | null;
  readonly fontFamily?: string | null;
  readonly fontWeight?: number | null;
  readonly fontColor?: string | null;
  readonly fontSize?: number | null;
  readonly lineHeight?: string | null;
  readonly s3Files?: string | null;
  readonly externalContent?: string | null;
  readonly calculatedValues?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type Activity = LazyLoading extends LazyLoadingDisabled
  ? EagerActivity
  : LazyActivity;

export declare const Activity: (new (init: ModelInit<Activity>) => Activity) & {
  copyOf(
    source: Activity,
    mutator: (draft: MutableModel<Activity>) => MutableModel<Activity> | void
  ): Activity;
};

type EagerDataPoint = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<DataPoint, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly dataPointKey?: string | null;
  readonly type?: string | null;
  readonly anchors?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyDataPoint = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<DataPoint, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly dataPointKey?: string | null;
  readonly type?: string | null;
  readonly anchors?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type DataPoint = LazyLoading extends LazyLoadingDisabled
  ? EagerDataPoint
  : LazyDataPoint;

export declare const DataPoint: (new (
  init: ModelInit<DataPoint>
) => DataPoint) & {
  copyOf(
    source: DataPoint,
    mutator: (draft: MutableModel<DataPoint>) => MutableModel<DataPoint> | void
  ): DataPoint;
};

type EagerDataPointInstance = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<DataPointInstance, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly dataPointKey?: string | null;
  readonly type?: string | null;
  readonly studyId?: string | null;
  readonly patientId?: string | null;
  readonly hashKey?: string | null;
  readonly armId?: string | null;
  readonly eventGroupId?: string | null;
  readonly eventId?: string | null;
  readonly activityGroupId?: string | null;
  readonly activityId?: string | null;
  readonly eventDayOffset?: number | null;
  readonly eventTime?: string | null;
  readonly questionId?: string | null;
  readonly answers?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyDataPointInstance = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<DataPointInstance, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly dataPointKey?: string | null;
  readonly type?: string | null;
  readonly studyId?: string | null;
  readonly patientId?: string | null;
  readonly hashKey?: string | null;
  readonly armId?: string | null;
  readonly eventGroupId?: string | null;
  readonly eventId?: string | null;
  readonly activityGroupId?: string | null;
  readonly activityId?: string | null;
  readonly eventDayOffset?: number | null;
  readonly eventTime?: string | null;
  readonly questionId?: string | null;
  readonly answers?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type DataPointInstance = LazyLoading extends LazyLoadingDisabled
  ? EagerDataPointInstance
  : LazyDataPointInstance;

export declare const DataPointInstance: (new (
  init: ModelInit<DataPointInstance>
) => DataPointInstance) & {
  copyOf(
    source: DataPointInstance,
    mutator: (
      draft: MutableModel<DataPointInstance>
    ) => MutableModel<DataPointInstance> | void
  ): DataPointInstance;
};

type EagerTaskAnswer = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TaskAnswer, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskInstanceId?: string | null;
  readonly activityId?: string | null;
  readonly questionId?: string | null;
  readonly answer?: string | null;
  readonly hashKey?: string | null;
  readonly syncState?: number | null;
  readonly syncStatus?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyTaskAnswer = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TaskAnswer, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskInstanceId?: string | null;
  readonly activityId?: string | null;
  readonly questionId?: string | null;
  readonly answer?: string | null;
  readonly hashKey?: string | null;
  readonly syncState?: number | null;
  readonly syncStatus?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type TaskAnswer = LazyLoading extends LazyLoadingDisabled
  ? EagerTaskAnswer
  : LazyTaskAnswer;

export declare const TaskAnswer: (new (
  init: ModelInit<TaskAnswer>
) => TaskAnswer) & {
  copyOf(
    source: TaskAnswer,
    mutator: (
      draft: MutableModel<TaskAnswer>
    ) => MutableModel<TaskAnswer> | void
  ): TaskAnswer;
};

type EagerTaskResult = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TaskResult, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskInstanceId?: string | null;
  readonly status?: string | null;
  readonly startedAt?: string | null;
  readonly completedAt?: string | null;
  readonly hashKey?: string | null;
  readonly syncState?: number | null;
  readonly syncStatus?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyTaskResult = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TaskResult, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskInstanceId?: string | null;
  readonly status?: string | null;
  readonly startedAt?: string | null;
  readonly completedAt?: string | null;
  readonly hashKey?: string | null;
  readonly syncState?: number | null;
  readonly syncStatus?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type TaskResult = LazyLoading extends LazyLoadingDisabled
  ? EagerTaskResult
  : LazyTaskResult;

export declare const TaskResult: (new (
  init: ModelInit<TaskResult>
) => TaskResult) & {
  copyOf(
    source: TaskResult,
    mutator: (
      draft: MutableModel<TaskResult>
    ) => MutableModel<TaskResult> | void
  ): TaskResult;
};

type EagerTaskHistory = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TaskHistory, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskInstanceId?: string | null;
  readonly status?: string | null;
  readonly statusBeforeExpired?: string | null;
  readonly timestamp?: string | null;
  readonly action?: string | null;
  readonly details?: string | null;
  readonly hashKey?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyTaskHistory = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TaskHistory, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskInstanceId?: string | null;
  readonly status?: string | null;
  readonly statusBeforeExpired?: string | null;
  readonly timestamp?: string | null;
  readonly action?: string | null;
  readonly details?: string | null;
  readonly hashKey?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type TaskHistory = LazyLoading extends LazyLoadingDisabled
  ? EagerTaskHistory
  : LazyTaskHistory;

export declare const TaskHistory: (new (
  init: ModelInit<TaskHistory>
) => TaskHistory) & {
  copyOf(
    source: TaskHistory,
    mutator: (
      draft: MutableModel<TaskHistory>
    ) => MutableModel<TaskHistory> | void
  ): TaskHistory;
};

type EagerTaskTempAnswer = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TaskTempAnswer, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskPk: string;
  readonly activityId: string;
  readonly answers: string;
  readonly localtime: string;
  readonly hashKey?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

type LazyTaskTempAnswer = {
  readonly [__modelMeta__]: {
    identifier: ManagedIdentifier<TaskTempAnswer, "id">;
    readOnlyFields: "createdAt" | "updatedAt";
  };
  readonly id: string;
  readonly pk: string;
  readonly sk: string;
  readonly taskPk: string;
  readonly activityId: string;
  readonly answers: string;
  readonly localtime: string;
  readonly hashKey?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
};

export declare type TaskTempAnswer = LazyLoading extends LazyLoadingDisabled
  ? EagerTaskTempAnswer
  : LazyTaskTempAnswer;

export declare const TaskTempAnswer: (new (
  init: ModelInit<TaskTempAnswer>
) => TaskTempAnswer) & {
  copyOf(
    source: TaskTempAnswer,
    mutator: (
      draft: MutableModel<TaskTempAnswer>
    ) => MutableModel<TaskTempAnswer> | void
  ): TaskTempAnswer;
};
