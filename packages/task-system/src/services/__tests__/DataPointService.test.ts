import { DataStore } from "@aws-amplify/datastore";
import { DataPoint, DataPointInstance } from "@models/index";
import { DataPointService } from "@services/DataPointService";
import {
  CreateDataPointInput,
  CreateDataPointInstanceInput,
} from "@task-types/DataPoint";

jest.mock("@aws-amplify/datastore");

const createMockDataPoint = (overrides: Partial<DataPoint> = {}): DataPoint =>
  ({
    id: "test-datapoint-id",
    pk: "test-pk",
    sk: "test-sk",
    dataPointKey: "test-key",
    type: "test-type",
    ...overrides,
  }) as DataPoint;

const createMockDataPointInstance = (
  overrides: Partial<DataPoint> = {}
): DataPoint =>
  ({
    id: "test-instance-id",
    pk: "test-pk",
    sk: "test-sk",
    dataPointKey: "test-key",
    ...overrides,
  }) as DataPoint;

describe("DataPointService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("DataPoint methods", () => {
    describe("createDataPoint", () => {
      it("should create a data point successfully", async () => {
        const mockDataPoint = createMockDataPoint();
        const input: CreateDataPointInput = {
          pk: "test-pk",
          sk: "test-sk",
          dataPointKey: "test-key",
          type: "test-type",
        };

        (DataStore.save as jest.Mock).mockResolvedValue(mockDataPoint);

        const result = await DataPointService.createDataPoint(input);

        expect(DataStore.save).toHaveBeenCalledWith(expect.any(DataPoint));
        expect(result).toEqual(mockDataPoint);
      });

      it("should throw error on create failure", async () => {
        const input: CreateDataPointInput = {
          pk: "test-pk",
          sk: "test-sk",
        };

        const error = new Error("Create failed");
        (DataStore.save as jest.Mock).mockRejectedValue(error);

        await expect(DataPointService.createDataPoint(input)).rejects.toThrow(
          "Create failed"
        );
      });
    });

    describe("getDataPoints", () => {
      it("should return all data points", async () => {
        const mockDataPoints = [
          createMockDataPoint({ id: "1" }),
          createMockDataPoint({ id: "2" }),
        ];
        (DataStore.query as jest.Mock).mockResolvedValue(mockDataPoints);

        const result = await DataPointService.getDataPoints();

        expect(DataStore.query).toHaveBeenCalledWith(DataPoint);
        expect(result).toEqual(mockDataPoints);
      });
    });

    describe("getDataPoint", () => {
      it("should return a data point by id", async () => {
        const mockDataPoint = createMockDataPoint({ id: "test-id" });
        (DataStore.query as jest.Mock).mockResolvedValue(mockDataPoint);

        const result = await DataPointService.getDataPoint("test-id");

        expect(DataStore.query).toHaveBeenCalledWith(DataPoint, "test-id");
        expect(result).toEqual(mockDataPoint);
      });

      it("should return null if data point not found", async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(null);

        const result = await DataPointService.getDataPoint("non-existent");

        expect(result).toBeNull();
      });
    });

    describe("updateDataPoint", () => {
      it("should update a data point successfully", async () => {
        const originalDataPoint = createMockDataPoint({
          id: "test-id",
          dataPointKey: "original-key",
        });
        const updatedDataPoint = createMockDataPoint({
          id: "test-id",
          dataPointKey: "updated-key",
        });

        (DataStore.query as jest.Mock).mockResolvedValue(originalDataPoint);
        (DataStore.save as jest.Mock).mockResolvedValue(updatedDataPoint);

        const result = await DataPointService.updateDataPoint("test-id", {
          dataPointKey: "updated-key",
        });

        expect(DataStore.query).toHaveBeenCalledWith(DataPoint, "test-id");
        expect(DataStore.save).toHaveBeenCalled();
        expect(result.dataPointKey).toBe("updated-key");
      });

      it("should throw error if data point not found", async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(null);

        await expect(
          DataPointService.updateDataPoint("non-existent", {
            dataPointKey: "updated-key",
          })
        ).rejects.toThrow("DataPoint with id non-existent not found");
      });
    });

    describe("deleteDataPoint", () => {
      it("should delete a data point successfully", async () => {
        const mockDataPoint = createMockDataPoint({ id: "test-id" });
        (DataStore.query as jest.Mock).mockResolvedValue(mockDataPoint);
        (DataStore.delete as jest.Mock).mockResolvedValue(mockDataPoint);

        await DataPointService.deleteDataPoint("test-id");

        expect(DataStore.query).toHaveBeenCalledWith(DataPoint, "test-id");
        expect(DataStore.delete).toHaveBeenCalledWith(mockDataPoint);
      });

      it("should throw error if data point not found", async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(null);

        await expect(
          DataPointService.deleteDataPoint("non-existent")
        ).rejects.toThrow("DataPoint with id non-existent not found");
      });
    });

    describe("subscribeDataPoints", () => {
      it("should subscribe to data point changes", () => {
        const mockDataPoints = [createMockDataPoint({ id: "1" })];
        const mockSubscription = {
          subscribe: jest.fn((observer: any) => {
            // Support both observer object ({ next }) and function callback signatures
            if (observer && typeof observer.next === "function") {
              observer.next({ items: mockDataPoints, isSynced: true });
            } else if (typeof observer === "function") {
              observer({ items: mockDataPoints, isSynced: true });
            }
            return { unsubscribe: jest.fn() };
          }),
        };

        (DataStore.observeQuery as jest.Mock).mockReturnValue(mockSubscription);
        (DataStore.observe as jest.Mock).mockReturnValue({
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        });

        const callback = jest.fn();
        const result = DataPointService.subscribeDataPoints(callback);

        expect(DataStore.observeQuery).toHaveBeenCalledWith(DataPoint);
        expect(callback).toHaveBeenCalledWith(mockDataPoints, true);
        expect(result).toHaveProperty("unsubscribe");
      });
    });
  });

  describe("DataPointInstance methods", () => {
    describe("createDataPointInstance", () => {
      it("should create a data point instance successfully", async () => {
        const mockInstance = createMockDataPointInstance();
        const input: CreateDataPointInstanceInput = {
          pk: "test-pk",
          sk: "test-sk",
          activityId: "test-activity-id",
          questionId: "test-question-id",
        };

        (DataStore.save as jest.Mock).mockResolvedValue(mockInstance);

        const result = await DataPointService.createDataPointInstance(input);

        expect(DataStore.save).toHaveBeenCalledWith(
          expect.any(DataPointInstance)
        );
        expect(result).toEqual(mockInstance);
      });

      it("should throw error on create failure", async () => {
        const input: CreateDataPointInstanceInput = {
          pk: "test-pk",
          sk: "test-sk",
        };

        const error = new Error("Create failed");
        (DataStore.save as jest.Mock).mockRejectedValue(error);

        await expect(
          DataPointService.createDataPointInstance(input)
        ).rejects.toThrow("Create failed");
      });
    });

    describe("getDataPointInstances", () => {
      it("should return all data point instances", async () => {
        const mockInstances = [
          createMockDataPointInstance({ id: "1" }),
          createMockDataPointInstance({ id: "2" }),
        ];
        (DataStore.query as jest.Mock).mockResolvedValue(mockInstances);

        const result = await DataPointService.getDataPointInstances();

        expect(DataStore.query).toHaveBeenCalledWith(DataPointInstance);
        expect(result).toEqual(mockInstances);
      });
    });

    describe("getDataPointInstance", () => {
      it("should return a data point instance by id", async () => {
        const mockInstance = createMockDataPointInstance({ id: "test-id" });
        (DataStore.query as jest.Mock).mockResolvedValue(mockInstance);

        const result = await DataPointService.getDataPointInstance("test-id");

        expect(DataStore.query).toHaveBeenCalledWith(
          DataPointInstance,
          "test-id"
        );
        expect(result).toEqual(mockInstance);
      });

      it("should return null if instance not found", async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(null);

        const result =
          await DataPointService.getDataPointInstance("non-existent");

        expect(result).toBeNull();
      });
    });

    describe("updateDataPointInstance", () => {
      it("should update a data point instance successfully", async () => {
        const originalInstance = createMockDataPointInstance({
          id: "test-id",
        });
        const updatedInstance = createMockDataPointInstance({
          id: "test-id",
        });

        (DataStore.query as jest.Mock).mockResolvedValue(originalInstance);
        (DataStore.save as jest.Mock).mockResolvedValue(updatedInstance);

        const result = await DataPointService.updateDataPointInstance(
          "test-id",
          {}
        );

        expect(DataStore.query).toHaveBeenCalledWith(
          DataPointInstance,
          "test-id"
        );
        expect(DataStore.save).toHaveBeenCalled();
        expect(result).toBe(updatedInstance);
      });

      it("should throw error if instance not found", async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(null);

        await expect(
          DataPointService.updateDataPointInstance("non-existent", {})
        ).rejects.toThrow("DataPointInstance with id non-existent not found");
      });
    });

    describe("deleteDataPointInstance", () => {
      it("should delete a data point instance successfully", async () => {
        const mockInstance = createMockDataPointInstance({ id: "test-id" });
        (DataStore.query as jest.Mock).mockResolvedValue(mockInstance);
        (DataStore.delete as jest.Mock).mockResolvedValue(mockInstance);

        await DataPointService.deleteDataPointInstance("test-id");

        expect(DataStore.query).toHaveBeenCalledWith(
          DataPointInstance,
          "test-id"
        );
        expect(DataStore.delete).toHaveBeenCalledWith(mockInstance);
      });

      it("should throw error if instance not found", async () => {
        (DataStore.query as jest.Mock).mockResolvedValue(null);

        await expect(
          DataPointService.deleteDataPointInstance("non-existent")
        ).rejects.toThrow("DataPointInstance with id non-existent not found");
      });
    });

    describe("subscribeDataPointInstances", () => {
      it("should subscribe to data point instance changes", () => {
        const mockInstances = [createMockDataPointInstance({ id: "1" })];
        const mockSubscription = {
          subscribe: jest.fn(callback => {
            callback({ items: mockInstances, isSynced: true });
            return { unsubscribe: jest.fn() };
          }),
        };

        (DataStore.observeQuery as jest.Mock).mockReturnValue(mockSubscription);
        (DataStore.observe as jest.Mock).mockReturnValue({
          subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        });

        const callback = jest.fn();
        const result = DataPointService.subscribeDataPointInstances(callback);

        expect(DataStore.observeQuery).toHaveBeenCalledWith(DataPointInstance);
        expect(callback).toHaveBeenCalledWith(mockInstances, true);
        expect(result).toHaveProperty("unsubscribe");
      });
    });
  });
});
