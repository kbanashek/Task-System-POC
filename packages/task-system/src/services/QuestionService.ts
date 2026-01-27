import { DataStore, OpType } from "@aws-amplify/datastore";
import { Question } from "@models/index";
import { CreateQuestionInput, UpdateQuestionInput } from "@task-types/Question";
import { logWithDevice, logErrorWithDevice } from "@utils/logging/deviceLogger";
import { ModelName } from "@constants/modelNames";
import { OperationSource } from "@constants/operationSource";
import { getServiceLogger } from "@utils/logging/serviceLogger";

type QuestionUpdateData = Omit<UpdateQuestionInput, "id" | "_version">;

export class QuestionService {
  /**
   * Create a new Question
   */
  static async createQuestion(input: CreateQuestionInput): Promise<Question> {
    const logger = getServiceLogger("QuestionService");
    try {
      logger.info("Creating question with DataStore", input);
      const question = await DataStore.save(
        new (Question as any)(input as any)
      );

      logger.info("Question created successfully", { id: question.id });
      return question;
    } catch (error) {
      logger.error("Error creating question", error);
      throw error;
    }
  }

  /**
   * Get all Questions
   */
  static async getQuestions(): Promise<Question[]> {
    try {
      return await DataStore.query(Question);
    } catch (error) {
      getServiceLogger("QuestionService").error(
        "Error fetching questions",
        error
      );
      throw error;
    }
  }

  /**
   * Get a Question by ID
   */
  static async getQuestion(id: string): Promise<Question | null> {
    try {
      const question = await DataStore.query(Question, id);
      return question || null;
    } catch (error) {
      getServiceLogger("QuestionService").error(
        "Error fetching question",
        error
      );
      throw error;
    }
  }

  /**
   * Update a Question
   */
  static async updateQuestion(
    id: string,
    data: QuestionUpdateData
  ): Promise<Question> {
    try {
      const original = await DataStore.query(Question, id);
      if (!original) {
        throw new Error(`Question with id ${id} not found`);
      }

      const updated = await DataStore.save(
        Question.copyOf(original, updated => {
          Object.assign(updated, data);
        })
      );

      return updated;
    } catch (error) {
      getServiceLogger("QuestionService").error(
        "Error updating question",
        error
      );
      throw error;
    }
  }

  /**
   * Delete a Question
   */
  static async deleteQuestion(id: string): Promise<void> {
    try {
      const toDelete = await DataStore.query(Question, id);
      if (!toDelete) {
        throw new Error(`Question with id ${id} not found`);
      }

      await DataStore.delete(toDelete);
    } catch (error) {
      getServiceLogger("QuestionService").error(
        "Error deleting question",
        error
      );
      throw error;
    }
  }

  /**
   * Subscribe to changes in Question items
   */
  static subscribeQuestions(
    callback: (items: Question[], isSynced: boolean) => void
  ): {
    unsubscribe: () => void;
  } {
    getServiceLogger("QuestionService").info(
      "Setting up DataStore subscription for Question"
    );

    const querySubscription = DataStore.observeQuery(Question).subscribe(
      snapshot => {
        const { items, isSynced } = snapshot;

        logWithDevice("QuestionService", "Subscription update (observeQuery)", {
          itemCount: items.length,
          isSynced,
          itemIds: items.map(i => i.id),
        });

        callback(items, isSynced);
      },
      error => {
        logErrorWithDevice(
          "QuestionService",
          "DataStore subscription error",
          error
        );
        callback([], false);
      }
    );

    // Also observe DELETE operations to ensure deletions trigger updates
    const deleteObserver = DataStore.observe(Question).subscribe(
      msg => {
        if (msg.opType === OpType.DELETE) {
          const element = msg.element as any;
          const isLocalDelete = element?._deleted === true;
          const source = isLocalDelete
            ? OperationSource.LOCAL
            : OperationSource.REMOTE_SYNC;

          logWithDevice(
            "QuestionService",
            `DELETE operation detected (${source})`,
            {
              questionId: element?.id,
              questionText: element?.question,
              deleted: element?._deleted,
              operationType: msg.opType,
            }
          );

          DataStore.query(Question)
            .then(questions => {
              logWithDevice(
                "QuestionService",
                "Query refresh after DELETE completed",
                {
                  remainingQuestionCount: questions.length,
                }
              );
              callback(questions, true);
            })
            .catch(err => {
              logErrorWithDevice(
                "QuestionService",
                "Error refreshing after delete",
                err
              );
            });
        }
      },
      error => {
        logErrorWithDevice("QuestionService", "DELETE observer error", error);
      }
    );

    return {
      unsubscribe: () => {
        logWithDevice("QuestionService", "Unsubscribing from DataStore");
        querySubscription.unsubscribe();
        deleteObserver.unsubscribe();
      },
    };
  }

  /**
   * Clear the DataStore completely
   */
  static async clearDataStore(): Promise<void> {
    try {
      await DataStore.clear();
    } catch (error) {
      getServiceLogger("QuestionService").error(
        "Error clearing DataStore",
        error
      );
      throw error;
    }
  }
}
