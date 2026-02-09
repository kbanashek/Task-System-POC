// @ts-check
import { initSchema } from "@aws-amplify/datastore";
import { schema } from "./schema";

const TaskType = {
  SCHEDULED: "SCHEDULED",
  TIMED: "TIMED",
  EPISODIC: "EPISODIC",
};

const TaskStatus = {
  OPEN: "OPEN",
  VISIBLE: "VISIBLE",
  STARTED: "STARTED",
  INPROGRESS: "INPROGRESS",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
  RECALLED: "RECALLED",
};

const {
  Task,
  Question,
  Activity,
  DataPoint,
  DataPointInstance,
  TaskAnswer,
  TaskResult,
  TaskHistory,
  TaskTempAnswer,
} = initSchema(schema);

export {
  Task,
  Question,
  Activity,
  DataPoint,
  DataPointInstance,
  TaskAnswer,
  TaskResult,
  TaskHistory,
  TaskTempAnswer,
  TaskType,
  TaskStatus,
};
