import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

import { DevOptionsScreen } from "../DevOptionsScreen";
import { TestIds } from "../../constants/testIds";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("../../components/SyncStatusBanner", () => ({
  SyncStatusBanner: () => null,
}));

jest.mock("@orion/task-system", () => ({
  GlobalHeader: ({ title }: { title: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require("react-native");
    return <Text>{title}</Text>;
  },
  // SyncHealthDashboard relies on these exports.
  NetworkStatus: { Online: "Online", Offline: "Offline" },
  SyncState: { Synced: "Synced", Syncing: "Syncing", Error: "Error" },
  useAmplifyState: () => ({
    isReady: true,
    networkStatus: "Online",
    syncState: "Synced",
    conflictCount: 0,
    pendingSyncCount: 0,
    lastSyncedAt: null,
  }),
}));

const mockUseDevOptions = jest.fn();
jest.mock("../../hooks/useDevOptions", () => ({
  useDevOptions: () => mockUseDevOptions(),
}));

describe("DevOptionsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDevOptions.mockReturnValue({
      isBusy: false,
      isImportingFixture: false,
      isSeedingAppointments: false,
      isDeleting: false,
      isForceSyncing: false,
      seedResult: null,
      appointmentSeedResult: null,
      generatedFixtureJson: "",
      lastError: null,
      generateFixtureJson: jest.fn(),
      importFixtureFromRepo: jest.fn().mockResolvedValue(undefined),
      generateFixtureAndImport: jest.fn().mockResolvedValue(undefined),
      freshCloudResetAndImport: jest.fn().mockResolvedValue(undefined),
      resetLocalAndImport: jest.fn().mockResolvedValue(undefined),
      seedAppointmentsOnly: jest.fn().mockResolvedValue(undefined),
      deleteTasksOnly: jest.fn().mockResolvedValue(undefined),
      deleteAppointmentsOnly: jest.fn().mockResolvedValue(undefined),
      nuclearDeleteCloud: jest.fn().mockResolvedValue(undefined),
      forceSyncThisDevice: jest.fn().mockResolvedValue(undefined),
      quickImportFixture: jest.fn().mockResolvedValue(undefined),
    });
  });

  it("renders main actions", () => {
    const screen = render(<DevOptionsScreen />);

    expect(screen.getByText("Dev Options")).toBeTruthy();
    expect(screen.getByText("🔄 Sync Tools")).toBeTruthy();
    expect(screen.getByText("📦 Data Tools")).toBeTruthy();
    expect(screen.getByText("🗑️ Delete Tools")).toBeTruthy();

    // Prefer testIDs over emoji text (more stable)
    expect(screen.getByTestId(TestIds.devOptions.forceResync)).toBeTruthy();
    expect(screen.getByTestId(TestIds.devOptions.quickImport)).toBeTruthy();
    expect(screen.getByTestId(TestIds.devOptions.deleteTasks)).toBeTruthy();
    expect(
      screen.getByTestId(TestIds.devOptions.deleteAppointments)
    ).toBeTruthy();
    expect(screen.getByTestId(TestIds.devOptions.nuclearDelete)).toBeTruthy();
  });
});
