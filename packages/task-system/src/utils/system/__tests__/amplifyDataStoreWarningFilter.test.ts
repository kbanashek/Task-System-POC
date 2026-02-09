import { installAmplifyDataStoreNoEndpointWarningFilter } from "../amplifyDataStoreWarningFilter";

jest.mock("@aws-amplify/core", () => {
  class ConsoleLogger {
    name: string;

    constructor(name: string) {
      this.name = name;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    warn(..._msg: unknown[]): void {
      // Intentionally empty: tests replace prototype.warn with spies.
    }
  }

  return { ConsoleLogger };
});

describe("installAmplifyDataStoreNoEndpointWarningFilter", () => {
  it("suppresses the specific DataStore no-endpoint warning", () => {
    const { ConsoleLogger } = jest.requireMock("@aws-amplify/core") as {
      ConsoleLogger: new (name: string) => {
        name: string;
        warn: (...msg: unknown[]) => void;
      };
    };

    const originalWarn = jest.fn<void, [unknown, ...unknown[]]>();
    const proto = ConsoleLogger.prototype as unknown as {
      warn: (...msg: unknown[]) => void;
    };
    proto.warn = originalWarn;

    installAmplifyDataStoreNoEndpointWarningFilter();

    const logger = new ConsoleLogger("DataStore");
    logger.warn(
      "Data won't be synchronized. No GraphQL endpoint configured. Did you forget `Amplify.configure(awsconfig)`?",
      { config: { foo: "bar" } }
    );

    expect(originalWarn).not.toHaveBeenCalled();
  });

  it("does not suppress other DataStore warnings", () => {
    const { ConsoleLogger } = jest.requireMock("@aws-amplify/core") as {
      ConsoleLogger: new (name: string) => {
        name: string;
        warn: (...msg: unknown[]) => void;
      };
    };

    const originalWarn = jest.fn<void, [unknown, ...unknown[]]>();
    const proto = ConsoleLogger.prototype as unknown as {
      warn: (...msg: unknown[]) => void;
    };
    proto.warn = originalWarn;

    installAmplifyDataStoreNoEndpointWarningFilter();

    const logger = new ConsoleLogger("DataStore");
    logger.warn("Sync error", new Error("boom"));

    expect(originalWarn).toHaveBeenCalledTimes(1);
  });

  it("does not suppress warnings from other logger categories", () => {
    const { ConsoleLogger } = jest.requireMock("@aws-amplify/core") as {
      ConsoleLogger: new (name: string) => {
        name: string;
        warn: (...msg: unknown[]) => void;
      };
    };

    const originalWarn = jest.fn<void, [unknown, ...unknown[]]>();
    const proto = ConsoleLogger.prototype as unknown as {
      warn: (...msg: unknown[]) => void;
    };
    proto.warn = originalWarn;

    installAmplifyDataStoreNoEndpointWarningFilter();

    const logger = new ConsoleLogger("Auth");
    logger.warn(
      "Data won't be synchronized. No GraphQL endpoint configured. Did you forget `Amplify.configure(awsconfig)`?"
    );

    expect(originalWarn).toHaveBeenCalledTimes(1);
  });

  it("is idempotent (calling twice does not wrap multiple times)", () => {
    const { ConsoleLogger } = jest.requireMock("@aws-amplify/core") as {
      ConsoleLogger: new (name: string) => {
        name: string;
        warn: (...msg: unknown[]) => void;
      };
    };

    const originalWarn = jest.fn<void, [unknown, ...unknown[]]>();
    const proto = ConsoleLogger.prototype as unknown as {
      warn: (...msg: unknown[]) => void;
    };
    proto.warn = originalWarn;

    installAmplifyDataStoreNoEndpointWarningFilter();
    installAmplifyDataStoreNoEndpointWarningFilter();

    const logger = new ConsoleLogger("DataStore");
    logger.warn("Sync error", new Error("boom"));

    expect(originalWarn).toHaveBeenCalledTimes(1);
  });
});
