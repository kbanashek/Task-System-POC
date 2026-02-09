/**
 * Context for managing task data source (static fixtures vs LX data).
 *
 * Allows switching between different fixture sources at runtime for testing
 * and validation purposes.
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import type { TaskSystemFixture } from "@fixtures/TaskSystemFixture";

/** Supported data source types for task-system fixtures. */
export type DataSourceType = "static" | "lx";

/** State tracked by the DataSource context. */
export interface DataSourceState {
  /** Current active data source */
  activeSource: DataSourceType;
  /** Available fixture sources */
  fixtures: {
    static: TaskSystemFixture | null;
    lx: TaskSystemFixture | null;
  };
  /** Loading state for each source */
  loading: {
    static: boolean;
    lx: boolean;
  };
}

/** Context value for the DataSource provider. */
export interface DataSourceContextValue extends DataSourceState {
  /** Switch to a different data source */
  setActiveSource: (source: DataSourceType) => void;
  /** Load a fixture for a specific source */
  loadFixture: (source: DataSourceType, fixture: TaskSystemFixture) => void;
  /** Get the currently active fixture */
  getActiveFixture: () => TaskSystemFixture | null;
  /** Check if a source has data loaded */
  hasData: (source: DataSourceType) => boolean;
  /** Clear all fixtures and reset state */
  reset: () => void;
}

const DataSourceContext = createContext<DataSourceContextValue | undefined>(
  undefined
);

const initialState: DataSourceState = {
  activeSource: "lx",
  fixtures: {
    static: null,
    lx: null,
  },
  loading: {
    static: false,
    lx: false,
  },
};

/**
 * Provider component for data source management.
 *
 * Wrap your app with this provider to enable data source switching.
 *
 * @example
 * ```tsx
 * <DataSourceProvider>
 *   <App />
 * </DataSourceProvider>
 * ```
 */
export const DataSourceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<DataSourceState>(initialState);

  const setActiveSource = useCallback((source: DataSourceType) => {
    setState(prev => ({
      ...prev,
      activeSource: source,
    }));
  }, []);

  const loadFixture = useCallback(
    (source: DataSourceType, fixture: TaskSystemFixture) => {
      setState(prev => ({
        ...prev,
        fixtures: {
          ...prev.fixtures,
          [source]: fixture,
        },
        loading: {
          ...prev.loading,
          [source]: false,
        },
      }));
    },
    []
  );

  const getActiveFixture = useCallback((): TaskSystemFixture | null => {
    return state.fixtures[state.activeSource];
  }, [state.activeSource, state.fixtures]);

  const hasData = useCallback(
    (source: DataSourceType): boolean => {
      return state.fixtures[source] !== null;
    },
    [state.fixtures]
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const value: DataSourceContextValue = {
    ...state,
    setActiveSource,
    loadFixture,
    getActiveFixture,
    hasData,
    reset,
  };

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
};

/**
 * Hook to access data source context.
 *
 * @throws Error if used outside DataSourceProvider
 *
 * @example
 * ```tsx
 * const { activeSource, setActiveSource, getActiveFixture } = useDataSource();
 *
 * // Switch to LX data
 * setActiveSource('lx');
 *
 * // Get current fixture
 * const fixture = getActiveFixture();
 * ```
 */
/** Hook to access data source context (static fixtures vs LX data). */
export const useDataSource = (): DataSourceContextValue => {
  const context = useContext(DataSourceContext);
  if (!context) {
    throw new Error("useDataSource must be used within DataSourceProvider");
  }
  return context;
};
