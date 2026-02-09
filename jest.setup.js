// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useSegments: () => [],
}));

// Mock AsyncStorage (required by TranslationContext and other modules in Jest)
// Must be mocked before @aws-amplify tries to load it
jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock @aws-amplify/react-native module loader to prevent AsyncStorage loading issues
jest.mock("@aws-amplify/react-native", () => ({
  loadAsyncStorage: jest.fn(() => {
    return require("@react-native-async-storage/async-storage");
  }),
  loadGetRandomValues: jest.fn(() => {
    return require("react-native-get-random-values");
  }),
}));

// Mock @aws-amplify/core to prevent native module loading
// Only export what we actually use (Hub) without loading the full module
jest.mock("@aws-amplify/core", () => ({
  Hub: {
    listen: jest.fn(() => ({ remove: jest.fn() })),
    dispatch: jest.fn(),
  },
  Amplify: {
    configure: jest.fn(),
    getConfig: jest.fn(() => ({})),
  },
}));

// Mock aws-amplify/storage to avoid native helpers (loadBase64) in Node/Jest environment
jest.mock('aws-amplify/storage', () => ({
  uploadData: jest.fn(() => Promise.resolve({ key: 'mock-key' })),
  getUrl: jest.fn(() => Promise.resolve('https://example.com/mock')),
  remove: jest.fn(() => Promise.resolve(true)),
  list: jest.fn(() => Promise.resolve([])),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) => {
    const { testID = "datetimepicker", onChange, ...rest } = props;
    return <View testID={testID} onChange={onChange} {...rest} />;
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock react-native-get-random-values for Amplify
jest.mock('react-native-get-random-values', () => ({
  polyfillGlobal: jest.fn(),
}));

// Mock @orion/task-system - provide mocks for contexts/hooks and services
// Service tests can import directly from source files to bypass this mock
jest.mock('@orion/task-system', () => {
  // Try to get actual module for hooks (hook tests need real implementations)
  let actualModule = {};
  try {
    actualModule = jest.requireActual('@orion/task-system');
  } catch (e) {
    // Silently fail - individual test files can mock services as needed
  }
  
  // Create mock contexts and hooks
  const mockUseAmplify = jest.fn(() => ({
    networkStatus: 'ONLINE',
    isOnline: true,
    isSynced: true,
  }));
  
  const mockUseTranslation = jest.fn(() => ({
    currentLanguage: "en",
    setLanguage: jest.fn(),
    translate: jest.fn(async (text: string) => text),
    translateSync: (text: string) => text,
    isTranslating: false,
    isRTL: false,
    supportedLanguages: [],
    translationService: {
      translateText: jest.fn(async (text: string) => text),
      translateBatch: jest.fn(async (texts: string[]) => texts),
    },
  }));

  // Mock useTranslatedText hook
  const mockUseTranslatedText = jest.fn((text: string) => ({
    translatedText: text,
    isTranslating: false,
  }));

  // Mock useRTL hook
  const mockUseRTL = jest.fn(() => ({
    rtlStyle: jest.fn((style: any) => style),
    isRTL: false,
  }));

  // Mock useGroupedTasks - try to use actual implementation first
  let mockUseGroupedTasks;
  if (actualModule.useGroupedTasks) {
    // Use actual implementation for hook tests
    mockUseGroupedTasks = actualModule.useGroupedTasks;
  } else {
    // Fallback mock for component tests that don't need the full implementation
    mockUseGroupedTasks = jest.fn((tasks: any[]) => {
      // Minimal mock for component tests - return array structure
      if (!tasks || tasks.length === 0) {
        return [];
      }
      // Group all tasks into "Today" for simplicity in component tests
      return [{ dayLabel: "Today", tasksWithoutTime: tasks, timeGroups: [] }];
    });
  }

  // Mock other commonly used hooks with minimal implementations
  const mockHook = jest.fn(() => ({}));
  
  // Create mock services - these are used by component tests
  const createMockService = (name: string) => ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(() => Promise.resolve([])),
    clear: jest.fn(),
    clearAppointments: jest.fn(),
    loadAppointments: jest.fn(() => Promise.resolve(null)),
    getAppointments: jest.fn(() => Promise.resolve([])),
    getAppointmentData: jest.fn(() => Promise.resolve(null)),
    saveAppointments: jest.fn(),
  });

  // Return merged: actual hooks (if available) + mocked contexts/hooks/services
  return Object.assign({}, actualModule, {
    // Override only contexts and hooks that need to be mocked for component tests
    useAmplify: mockUseAmplify,
    AmplifyProvider: ({ children }: any) => children,
    useTranslation: mockUseTranslation,
    TranslationProvider: ({ children }: any) => children,
    // Preserve actual hooks for hook tests, but provide mocks for component tests
    useTranslatedText: actualModule.useTranslatedText || mockUseTranslatedText,
    useRTL: actualModule.useRTL || mockUseRTL,
    useGroupedTasks: actualModule.useGroupedTasks || mockUseGroupedTasks,
    useActivity: actualModule.useActivity || mockHook,
    useActivityData: actualModule.useActivityData || mockHook,
    useActivityList: actualModule.useActivityList || mockHook,
    useAnswerManagement: actualModule.useAnswerManagement || mockHook,
    useAppointmentList: actualModule.useAppointmentList || mockHook,
    useColorScheme: actualModule.useColorScheme || jest.fn(() => 'light'),
    useDataPointInstance: actualModule.useDataPointInstance || mockHook,
    useDataPointList: actualModule.useDataPointList || mockHook,
    useNetworkStatus: actualModule.useNetworkStatus || mockHook,
    useQuestionList: actualModule.useQuestionList || mockHook,
    useQuestionNavigation: actualModule.useQuestionNavigation || mockHook,
    useQuestionScreenButtons: actualModule.useQuestionScreenButtons || mockHook,
    useQuestionsScreen: actualModule.useQuestionsScreen || mockHook,
    useQuestionSubmission: actualModule.useQuestionSubmission || mockHook,
    useQuestionValidation: actualModule.useQuestionValidation || mockHook,
    useTaskAnswer: actualModule.useTaskAnswer || mockHook,
    useTaskAnswerList: actualModule.useTaskAnswerList || mockHook,
    useTaskContainer: actualModule.useTaskContainer || mockHook,
    useTaskFilters: actualModule.useTaskFilters || mockHook,
    useTaskForm: actualModule.useTaskForm || mockHook,
    useTaskHistoryList: actualModule.useTaskHistoryList || mockHook,
    useTaskList: actualModule.useTaskList || mockHook,
    useTaskResultList: actualModule.useTaskResultList || mockHook,
    useTaskUpdate: actualModule.useTaskUpdate || mockHook,
    useThemeColor: actualModule.useThemeColor || jest.fn(() => '#000000'),
    // Mock services for component tests
    ActivityService: actualModule.ActivityService || createMockService('ActivityService'),
    AppointmentService: actualModule.AppointmentService || createMockService('AppointmentService'),
    TaskService: actualModule.TaskService || createMockService('TaskService'),
    QuestionService: actualModule.QuestionService || createMockService('QuestionService'),
    DataPointService: actualModule.DataPointService || createMockService('DataPointService'),
    TaskAnswerService: actualModule.TaskAnswerService || createMockService('TaskAnswerService'),
    TaskResultService: actualModule.TaskResultService || createMockService('TaskResultService'),
    TaskHistoryService: actualModule.TaskHistoryService || createMockService('TaskHistoryService'),
    SeededDataCleanupService: actualModule.SeededDataCleanupService || createMockService('SeededDataCleanupService'),
    TranslationService: actualModule.TranslationService || createMockService('TranslationService'),
    TranslationMemoryService: actualModule.TranslationMemoryService || createMockService('TranslationMemoryService'),
    ConflictResolution: actualModule.ConflictResolution || {},
    // Export types
    NetworkStatus: actualModule.NetworkStatus || { ONLINE: 'ONLINE', OFFLINE: 'OFFLINE' },
    TaskType: actualModule.TaskType || { SCHEDULED: 'SCHEDULED', TIMED: 'TIMED', EPISODIC: 'EPISODIC' },
    TaskStatus: actualModule.TaskStatus || { OPEN: 'OPEN', COMPLETED: 'COMPLETED' },
  });
});

jest.mock('@aws-amplify/datastore', () => {
  const createModelClass = (name: string) => {
    class ModelClass {
      static copyOf(original: any, updater: (draft: any) => void) {
        const draft = { ...original };
        updater(draft);
        return draft;
      }
      constructor(data: any) {
        Object.assign(this, data);
      }
    }
    return ModelClass;
  };

  const mockDataStore = {
    configure: jest.fn(),
    query: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    observeQuery: jest.fn(() => ({
      subscribe: jest.fn(() => ({
        unsubscribe: jest.fn(),
      })),
    })),
    observe: jest.fn(() => ({
      subscribe: jest.fn(() => ({
        unsubscribe: jest.fn(),
      })),
    })),
    start: jest.fn(),
    stop: jest.fn(),
  };

  const mockModels = {
    Todo: createModelClass('Todo'),
    Task: createModelClass('Task'),
    Question: createModelClass('Question'),
    Activity: createModelClass('Activity'),
    DataPoint: createModelClass('DataPoint'),
    DataPointInstance: createModelClass('DataPointInstance'),
    TaskAnswer: createModelClass('TaskAnswer'),
    TaskResult: createModelClass('TaskResult'),
    TaskHistory: createModelClass('TaskHistory'),
  };

  return {
    DataStore: mockDataStore,
    OpType: {
      CREATE: 'CREATE',
      INSERT: 'INSERT',
      UPDATE: 'UPDATE',
      DELETE: 'DELETE',
    },
    initSchema: jest.fn(() => mockModels),
  };
});

// Helper function to create model classes with copyOf method
const createModelClass = (name: string) => {
  class ModelClass {
    static copyOf(original: any, updater: (draft: any) => void) {
      const draft = { ...original };
      updater(draft);
      return draft;
    }
    constructor(data: any) {
      Object.assign(this, data);
    }
  }
  return ModelClass;
};

const mockModels = {
  Task: createModelClass('Task'),
  Question: createModelClass('Question'),
  Activity: createModelClass('Activity'),
  DataPoint: createModelClass('DataPoint'),
  DataPointInstance: createModelClass('DataPointInstance'),
  TaskAnswer: createModelClass('TaskAnswer'),
  TaskResult: createModelClass('TaskResult'),
  TaskHistory: createModelClass('TaskHistory'),
  Todo: createModelClass('Todo'),
};

jest.mock('./models', () => ({
  ...mockModels,
  TaskType: {
    SCHEDULED: 'SCHEDULED',
    TIMED: 'TIMED',
    EPISODIC: 'EPISODIC',
  },
  TaskStatus: {
    OPEN: 'OPEN',
    VISIBLE: 'VISIBLE',
    STARTED: 'STARTED',
    INPROGRESS: 'INPROGRESS',
    COMPLETED: 'COMPLETED',
    EXPIRED: 'EXPIRED',
    RECALLED: 'RECALLED',
  },
}));

// Mock package models - use the same mockModels
// This matches the import path used in packages/task-system/src/hooks/useQuestionsScreen.ts
jest.mock('./packages/task-system/src/models', () => ({
  ...mockModels,
  TaskType: {
    SCHEDULED: 'SCHEDULED',
    TIMED: 'TIMED',
    EPISODIC: 'EPISODIC',
  },
  TaskStatus: {
    OPEN: 'OPEN',
    VISIBLE: 'VISIBLE',
    STARTED: 'STARTED',
    INPROGRESS: 'INPROGRESS',
    COMPLETED: 'COMPLETED',
    EXPIRED: 'EXPIRED',
    RECALLED: 'RECALLED',
  },
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

