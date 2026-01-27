import { DataStore, OpType } from "@aws-amplify/datastore";
// @ts-ignore - Activity is exported from models/index.js at runtime
import { ModelName } from "@constants/modelNames";
import { OperationSource } from "@constants/operationSource";
import { Activity } from "@models/index";
import { CreateActivityInput, UpdateActivityInput } from "@task-types/Activity";
import { logWithDevice } from "@utils/logging/deviceLogger";
import { getServiceLogger } from "@utils/logging/serviceLogger";
import { dataSubscriptionLogger } from "@utils/logging/dataSubscriptionLogger";

type ActivityUpdateData = Omit<UpdateActivityInput, "id" | "_version">;

export class ActivityService {
  static async createActivity(input: CreateActivityInput): Promise<Activity> {
    try {
      logWithDevice(
        "ActivityService",
        "Creating activity with DataStore",
        input as unknown as Record<string, unknown>
      );
      const activity = await DataStore.save(
        new Activity({
          ...input,
        })
      );

      logWithDevice("ActivityService", "Activity created successfully", {
        id: activity.id,
      });
      return activity;
    } catch (error) {
      getServiceLogger("ActivityService").error(
        "Error creating activity",
        error
      );
      throw error;
    }
  }

  static async getActivities(): Promise<Activity[]> {
    try {
      return await DataStore.query(Activity);
    } catch (error) {
      getServiceLogger("ActivityService").error(
        "Error fetching activities",
        error
      );
      throw error;
    }
  }

  static async getActivity(id: string): Promise<Activity | null> {
    try {
      const activity = await DataStore.query(Activity, id);
      return activity || null;
    } catch (error) {
      getServiceLogger("ActivityService").error(
        "Error fetching activity",
        error
      );
      throw error;
    }
  }

  static async updateActivity(
    id: string,
    data: ActivityUpdateData
  ): Promise<Activity> {
    try {
      const original = await DataStore.query(Activity, id);
      if (!original) {
        throw new Error(`Activity with id ${id} not found`);
      }

      const updated = await DataStore.save(
        Activity.copyOf(original, updated => {
          Object.assign(updated, data);
        })
      );

      return updated;
    } catch (error) {
      getServiceLogger("ActivityService").error(
        "Error updating activity",
        error
      );
      throw error;
    }
  }

  static async deleteActivity(id: string): Promise<void> {
    try {
      const toDelete = await DataStore.query(Activity, id);
      if (!toDelete) {
        throw new Error(`Activity with id ${id} not found`);
      }

      await DataStore.delete(toDelete);
    } catch (error) {
      getServiceLogger("ActivityService").error(
        "Error deleting activity",
        error
      );
      throw error;
    }
  }

  static subscribeActivities(
    callback: (items: Activity[], isSynced: boolean) => void
  ): {
    unsubscribe: () => void;
  } {
    // Use centralized logger to prevent duplicate subscription setup logs
    dataSubscriptionLogger.logServiceSetup(
      "ActivityService",
      "Setting up AWS DataStore subscription for Activity model",
      "☁️"
    );

    const querySubscription = DataStore.observeQuery(Activity).subscribe(
      snapshot => {
        const { items, isSynced } = snapshot;

        // VERBOSE LOGGING FOR DEBUGGING SYNC ISSUES
        logWithDevice(
          "ActivityService",
          `📋 AWS DataStore subscription fired - ${items.length} activities`,
          {
            activityCount: items.length,
            isSynced,
            syncStatus: isSynced ? "cloud-synced" : "local-only",
            activityIds: items.map(i => i.id),
            activityNames: items.map(i => i.name),
            timestamp: new Date().toISOString(),
          }
        );

        callback(items, isSynced);
      },
      (error: unknown) => {
        getServiceLogger("ActivityService").error(
          "DataStore subscription error",
          error instanceof Error ? error : new Error(String(error)),
          "DATA",
          "❌"
        );
        callback([], false);
      }
    );

    // Also observe DELETE operations to ensure deletions trigger updates
    const deleteObserver = DataStore.observe(Activity).subscribe(
      msg => {
        if (msg.opType === OpType.DELETE) {
          const element = msg.element as any;
          const isLocalDelete = element?._deleted === true;
          const source = isLocalDelete
            ? OperationSource.LOCAL
            : OperationSource.REMOTE_SYNC;

          logWithDevice(
            "ActivityService",
            `DELETE operation detected (${source})`,
            {
              activityId: element?.id,
              activityName: element?.name || element?.title,
              deleted: element?._deleted,
              operationType: msg.opType,
            }
          );

          DataStore.query(Activity)
            .then(activities => {
              logWithDevice(
                "ActivityService",
                "Query refresh after DELETE completed",
                {
                  remainingActivityCount: activities.length,
                  remainingActivityIds: activities.map(a => a.id),
                }
              );
              callback(activities, true);
            })
            .catch((err: unknown) => {
              getServiceLogger("ActivityService").error(
                "Error refreshing after delete",
                err instanceof Error ? err : new Error(String(err)),
                "DATA",
                "❌"
              );
            });
        }
      },
      (error: unknown) => {
        getServiceLogger("ActivityService").error(
          "DELETE observer error",
          error instanceof Error ? error : new Error(String(error)),
          "DATA",
          "❌"
        );
      }
    );

    return {
      unsubscribe: () => {
        logWithDevice("ActivityService", "Unsubscribing from DataStore");
        querySubscription.unsubscribe();
        deleteObserver.unsubscribe();
      },
    };
  }

  static async clearDataStore(): Promise<void> {
    try {
      await DataStore.clear();
    } catch (error) {
      getServiceLogger("ActivityService").error(
        "Error clearing DataStore",
        error
      );
      throw error;
    }
  }
}
