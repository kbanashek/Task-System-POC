# Data Source Toggle System

The data source toggle system allows you to switch between static fixture data and LX production data at runtime for testing and validation.

## Quick Start

### 1. Wrap Your App with DataSourceProvider

```tsx
import { DataSourceProvider } from "@contexts/DataSourceContext";

function App() {
  return <DataSourceProvider>{/* Your app components */}</DataSourceProvider>;
}
```

### 2. Add the Toggle UI

```tsx
import { DataSourceToggle } from "@components/dev/DataSourceToggle";

function DebugScreen() {
  return (
    <View>
      <DataSourceToggle showCounts />
      {/* Rest of your screen */}
    </View>
  );
}
```

### 3. Load Data Sources

```tsx
import { useFixtureLoader } from "@hooks/useFixtureLoader";
import { lxToTaskSystemAdapter } from "@utils/lxToTaskSystemAdapter";

function DataLoader() {
  const { loadStaticFixture, loadLxFixture } = useFixtureLoader();

  // Load static fixture
  const handleLoadStatic = async () => {
    await loadStaticFixture();
  };

  // Load LX data
  const handleLoadLx = async lxResponse => {
    const fixture = lxToTaskSystemAdapter(lxResponse);
    await loadLxFixture(fixture);
  };

  return (
    <View>
      <Button title="Load Static" onPress={handleLoadStatic} />
      <Button title="Load LX Data" onPress={() => handleLoadLx(lxData)} />
    </View>
  );
}
```

## Complete Example

Here's a complete example using the DataSourceManager component:

```tsx
import React from "react";
import { View, ScrollView } from "react-native";
import { DataSourceProvider } from "@contexts/DataSourceContext";
import { DataSourceManager } from "@components/dev/DataSourceManager";
import { TaskListScreen } from "@screens/TaskListScreen";

export default function App() {
  return (
    <DataSourceProvider>
      <ScrollView>
        {/* Data source controls */}
        <DataSourceManager showDetails />

        {/* Your task UI - will render data from active source */}
        <TaskListScreen />
      </ScrollView>
    </DataSourceProvider>
  );
}
```

## Components

### DataSourceProvider

Context provider that manages data source state.

**Props:** None

**Usage:**

```tsx
<DataSourceProvider>
  <App />
</DataSourceProvider>
```

### DataSourceToggle

Toggle component for switching between data sources.

**Props:**

- `showCounts?: boolean` - Show task counts for each source (default: true)
- `style?: object` - Custom container styles

**Features:**

- Visual indication of active source
- Disabled state for sources without data
- Task count display
- Status indicator

**Usage:**

```tsx
<DataSourceToggle showCounts />
```

### DataSourceManager

Complete data source management UI with loading controls.

**Props:**

- `showDetails?: boolean` - Show detailed status (default: true)
- `style?: object` - Custom container styles

**Features:**

- Data source toggle
- Load static fixture button
- Reload active fixture button
- Import result display
- Error handling
- Usage instructions

**Usage:**

```tsx
<DataSourceManager showDetails />
```

## Hooks

### useDataSource

Access data source context.

**Returns:**

```typescript
{
  activeSource: 'static' | 'lx',
  fixtures: { static: Fixture | null, lx: Fixture | null },
  loading: { static: boolean, lx: boolean },
  setActiveSource: (source) => void,
  loadFixture: (source, fixture) => void,
  getActiveFixture: () => Fixture | null,
  hasData: (source) => boolean,
  reset: () => void
}
```

**Usage:**

```tsx
const { activeSource, setActiveSource, getActiveFixture } = useDataSource();

// Switch to LX data
setActiveSource("lx");

// Get current fixture
const fixture = getActiveFixture();
```

### useFixtureLoader

Load and manage fixtures with data source awareness.

**Options:**

```typescript
{
  autoLoad?: boolean,  // Auto-load static fixture on mount
  importOptions?: {    // DataStore import options
    updateExisting?: boolean,
    pruneNonFixture?: boolean,
    pruneDerivedModels?: boolean
  }
}
```

**Returns:**

```typescript
{
  loadFixture: (source, fixture) => Promise<Result>,
  loadStaticFixture: () => Promise<Result>,
  loadLxFixture: (fixture) => Promise<Result>,
  reloadActiveFixture: () => Promise<Result>,
  loading: boolean,
  error: Error | null,
  lastResult: Result | null
}
```

**Usage:**

```tsx
const { loadLxFixture, loading, error } = useFixtureLoader({
  autoLoad: true,
  importOptions: {
    updateExisting: true,
    pruneNonFixture: false,
  },
});

// Load LX data
const fixture = lxToTaskSystemAdapter(lxResponse);
await loadLxFixture(fixture);
```

## Loading LX Data

### Method 1: Using useFixtureLoader Hook

```tsx
import { useFixtureLoader } from "@hooks/useFixtureLoader";
import { lxToTaskSystemAdapter } from "@utils/lxToTaskSystemAdapter";

function MyComponent() {
  const { loadLxFixture } = useFixtureLoader();

  const handleLoadLxData = async lxResponse => {
    // Convert LX response to fixture
    const fixture = lxToTaskSystemAdapter(lxResponse, {
      studyVersion: "1.0",
      studyStatus: "LIVE",
      fixtureId: "lx-production-data",
    });

    // Load into DataStore and context
    const result = await loadLxFixture(fixture);

    console.log(`Loaded ${result.tasks.created} tasks`);
  };

  return <Button title="Load LX Data" onPress={() => handleLoadLxData(data)} />;
}
```

### Method 2: Manual Loading

```tsx
import { useDataSource } from "@contexts/DataSourceContext";
import { FixtureImportService } from "@services/FixtureImportService";
import { lxToTaskSystemAdapter } from "@utils/lxToTaskSystemAdapter";

function MyComponent() {
  const { loadFixture } = useDataSource();

  const handleLoadLxData = async lxResponse => {
    // Convert to fixture
    const fixture = lxToTaskSystemAdapter(lxResponse);

    // Import to DataStore
    await FixtureImportService.importTaskSystemFixture(fixture);

    // Store in context
    loadFixture("lx", fixture);
  };

  return <Button title="Load LX Data" onPress={() => handleLoadLxData(data)} />;
}
```

### Method 3: From JSON File

```tsx
import { useFixtureLoader } from "@hooks/useFixtureLoader";

function MyComponent() {
  const { loadLxFixture } = useFixtureLoader();

  const handleLoadFromFile = async () => {
    // Import the fixture JSON
    const lxFixture = await import("@fixtures/lx-production-tasks.json");

    // Load it
    await loadLxFixture(lxFixture.default);
  };

  return <Button title="Load LX Fixture" onPress={handleLoadFromFile} />;
}
```

## Switching Data Sources

The toggle automatically switches between sources when you click them. You can also switch programmatically:

```tsx
import { useDataSource } from "@contexts/DataSourceContext";

function MyComponent() {
  const { activeSource, setActiveSource, hasData } = useDataSource();

  const switchToLx = () => {
    if (hasData("lx")) {
      setActiveSource("lx");
    } else {
      console.log("LX data not loaded yet");
    }
  };

  const switchToStatic = () => {
    if (hasData("static")) {
      setActiveSource("static");
    } else {
      console.log("Static data not loaded yet");
    }
  };

  return (
    <View>
      <Text>Current: {activeSource}</Text>
      <Button title="Switch to LX" onPress={switchToLx} />
      <Button title="Switch to Static" onPress={switchToStatic} />
    </View>
  );
}
```

## Integration with Task List

Your task list components don't need to change - they'll automatically render data from the active source:

```tsx
import { useTaskList } from "@hooks/useTaskList";

function TaskListScreen() {
  // This automatically uses data from the active source
  const { tasks, loading } = useTaskList();

  return (
    <FlatList
      data={tasks}
      renderItem={({ item }) => <TaskCard task={item} />}
    />
  );
}
```

The data source toggle works at the DataStore level, so all your existing hooks and components work without modification.

## Development Workflow

### 1. Start with Static Data

```tsx
// Load default static fixture on app start
const { loadStaticFixture } = useFixtureLoader({ autoLoad: true });
```

### 2. Export LX Data

Follow the [LX Task Data Integration](./lx-task-data-integration.md) guide to export production data.

### 3. Convert and Load

```tsx
// Convert LX JSON to fixture
const fixture = lxToTaskSystemAdapter(lxResponse);

// Load into app
await loadLxFixture(fixture);
```

### 4. Compare Rendering

Use the toggle to switch between static and LX data and compare:

- Task titles and descriptions
- Task times and dates
- Task icons and statuses
- Task grouping
- Activity rendering

### 5. Iterate

If you find differences:

1. Check field mapping in the adapter
2. Verify LX data structure
3. Update task-system rendering logic
4. Re-test with toggle

## Testing

### Unit Tests

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useDataSource } from '@contexts/DataSourceContext';
import { DataSourceProvider } from '@contexts/DataSourceContext';

describe('Data Source Toggle', () => {
  it('should switch between sources', () => {
    const wrapper = ({ children }) => (
      <DataSourceProvider>{children}</DataSourceProvider>
    );

    const { result } = renderHook(() => useDataSource(), { wrapper });

    expect(result.current.activeSource).toBe('static');

    act(() => {
      result.current.setActiveSource('lx');
    });

    expect(result.current.activeSource).toBe('lx');
  });
});
```

### Integration Tests

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { DataSourceToggle } from '@components/dev/DataSourceToggle';

describe('DataSourceToggle', () => {
  it('should render both options', () => {
    const { getByText } = render(<DataSourceToggle />);

    expect(getByText('Static Fixture')).toBeTruthy();
    expect(getByText('LX Data')).toBeTruthy();
  });

  it('should disable sources without data', () => {
    const { getByText } = render(<DataSourceToggle />);

    const lxButton = getByText('LX Data');
    expect(lxButton.props.disabled).toBe(true);
  });
});
```

## Troubleshooting

### Toggle is Disabled

**Cause:** No data loaded for that source.

**Solution:** Load data first using `loadStaticFixture()` or `loadLxFixture()`.

### Data Not Updating After Switch

**Cause:** Components not re-rendering when data source changes.

**Solution:** Ensure components use hooks that subscribe to DataStore changes (like `useTaskList`).

### LX Data Won't Load

**Cause:** Invalid LX JSON structure or conversion error.

**Solution:**

1. Verify LX JSON matches expected structure
2. Check console for adapter errors
3. Validate fixture format

### Tasks Render Differently

**Cause:** Field mapping differences between LX and static data.

**Solution:**

1. Compare fixture structures side-by-side
2. Check adapter field transformations
3. Verify task-system rendering logic handles both formats

## Best Practices

1. **Load Static First**: Always load static fixture first as a baseline
2. **Test Incrementally**: Load small LX datasets before full production data
3. **Compare Side-by-Side**: Use toggle to quickly compare rendering
4. **Document Differences**: Note any rendering differences for investigation
5. **Clean State**: Use `pruneNonFixture` when switching to ensure clean state
6. **Version Fixtures**: Use `fixtureId` to track which LX data you're testing

## Related Documentation

- [LX Task Data Integration](./lx-task-data-integration.md)
- [Fixture Format](../architecture/fixture-format.md)
- [Testing Guide](../testing/integration-tests.md)
