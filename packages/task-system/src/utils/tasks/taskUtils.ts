import { Task } from "@task-types/Task";
import { getServiceLogger } from "@utils/logging/serviceLogger";

const logger = getServiceLogger("taskUtils");

/**
 * Extract activity ID from a task
 * Priority:
 * 1. Use task.entityId if present
 * 2. Parse task.actions JSON string to extract entityId from first action
 * 3. Handle format: "Activity.{activityId}" or "Activity.{activityId}#{version}"
 * 4. Strip version suffix if present
 *
 * @param task - The task to extract activity ID from
 * @returns The activity ID (without "Activity." prefix) or null if not found
 */
export const extractActivityIdFromTask = (task: Task): string | null => {
  // Priority 1: Use entityId if present
  // Validate that entityId is a string before calling string methods
  if (task.entityId && typeof task.entityId === "string") {
    // Handle format: "Activity.{activityId}" or "Activity.{activityId}#{version}"
    const activityId = task.entityId.replace(/^Activity\./, "").split("#")[0];
    // Validate that the extracted ID is non-empty before returning
    if (activityId && activityId.trim().length > 0) {
      logger.debug("Extracted activity ID from entityId", {
        entityId: task.entityId,
        extractedId: activityId,
      });
      return activityId;
    }
  }

  // Priority 2: Parse actions JSON string
  if (task.actions) {
    try {
      const actions = JSON.parse(task.actions);
      if (Array.isArray(actions) && actions.length > 0) {
        const firstAction = actions[0];
        // Validate that entityId exists and is a string before calling string methods
        if (firstAction?.entityId && typeof firstAction.entityId === "string") {
          // Handle format: "Activity.{activityId}" or "Activity.{activityId}#{version}"
          const activityId = firstAction.entityId
            .replace(/^Activity\./, "")
            .split("#")[0];
          // Validate that the extracted ID is non-empty before returning
          if (activityId && activityId.trim().length > 0) {
            logger.debug("Extracted activity ID from actions", {
              actions: task.actions,
              extractedId: activityId,
            });
            return activityId;
          }
        }
      }
    } catch (error) {
      logger.error("Failed to parse task.actions JSON", error);
    }
  }

  logger.debug("No activity ID found in task", {
    hasEntityId: !!task.entityId,
    hasActions: !!task.actions,
  });
  return null;
};
