import { Amplify } from "@aws-amplify/core";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  AmplifyProvider,
  FixtureImportService,
  TaskActivityModule,
  TranslationProvider,
  initTaskSystem,
} from "@orion/task-system";
import awsconfig from "../../../../aws-exports";
import { bootstrapTaskSystem } from "../../../../src/bootstrap/taskSystemBootstrap";
import fixture from "../../../../src/fixtures/task-system.fixture.v1.json";

/**
 * LXHostExample
 *
 * This is an example of the intended ownership model for LX integration:
 * - LX (host app) owns Amplify.configure()
 * - LX (host app) owns DataStore lifecycle (start/stop/clear)
 * - @orion/task-system does NOT call Amplify.configure()
 * - @orion/task-system can be mounted after the host has bootstrapped DataStore
 *
 * NOTE: This repo's real entrypoint uses src/amplify-init-sync.ts + app/_layout.tsx.
 * This file is a copyable example for LX teams/agents.
 */
export interface LXHostExampleProps {
  /**
   * If true, this example will call Amplify.configure() itself.
   * In this repo's app runtime, Amplify is already configured in app/_layout.tsx,
   * so the in-app test screen passes false.
   *
   * In LX, this should be true only if this component owns the host startup.
   */
  configureAmplify?: boolean;
  /**
   * If true, this example will start DataStore (via bootstrap) before importing fixture.
   * In this repo's app runtime DataStore is already started in app/_layout.tsx, so false.
   */
  startDataStore?: boolean;
  /**
   * If true, imports the bundled JSON fixture into DataStore.
   */
  importFixture?: boolean;

  /**
   * If true, this component will NOT wrap the module in SafeAreaProvider/TranslationProvider/AmplifyProvider.
   * Use this when embedding inside an app that already provides these at the root (like this repo).
   *
   * Default: false (standalone example for LX copy/paste).
   */
  embedded?: boolean;

  /**
   * If true, configures TempAnswerSyncService with a real Amplify GraphQL executor/mapper
   * and renders small debug actions (flush + inspect outbox).
   *
   * Default: false
   */
  enableTempAnswerSyncDemo?: boolean;

  /**
   * Optional: pass-through to TaskActivityModule to support "tab re-press" reset behavior
   * in the host harness.
   */
  resetSignal?: number;
}

export function LXHostExample({
  configureAmplify = true,
  startDataStore = true,
  importFixture = true,
  embedded = false,
  enableTempAnswerSyncDemo = false,
  resetSignal,
}: LXHostExampleProps): React.ReactElement | null {
  const [ready, setReady] = useState(false);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [lastFlush, setLastFlush] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) Host configures Amplify (auth + endpoint + DataStore config).
        if (configureAmplify) {
          Amplify.configure(awsconfig as any);
        }

        // 2) Host bootstraps task-system + starts DataStore (single-flight).
        if (startDataStore) {
          await bootstrapTaskSystem({ startDataStore: true });
        } else {
          await initTaskSystem({ startDataStore: false });
        }

        // 3) Host-owned data: import fixture JSON into DataStore for editing/version control.
        if (importFixture) {
          await FixtureImportService.importTaskSystemFixture(fixture as any, {
            updateExisting: true,
          });
        }

        if (enableTempAnswerSyncDemo) {
          // TempAnswerSyncService now uses DataStore directly
          // No configuration needed - DataStore handles sync automatically
          console.log("[LXHostExample] TempAnswerSync enabled via DataStore");
        }
      } catch (error) {
        console.error("[LXHostExample] bootstrap failed", error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      // DataStore cleanup happens automatically
    };
  }, [
    configureAmplify,
    enableTempAnswerSyncDemo,
    importFixture,
    startDataStore,
  ]);

  if (!ready) return null;

  // DataStore handles sync automatically - no manual outbox management needed
  const refreshOutbox = async (): Promise<void> => {
    setOutboxCount(0); // DataStore manages its own queue
  };

  const flushOutbox = async (): Promise<void> => {
    setLastFlush(`DataStore auto-syncing @ ${new Date().toLocaleTimeString()}`);
    await refreshOutbox();
  };

  // Embedded mode: host app already provides SafeAreaProvider/TranslationProvider/AmplifyProvider.
  if (embedded) {
    return (
      <View style={{ flex: 1 }}>
        {enableTempAnswerSyncDemo ? (
          <View style={{ padding: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void refreshOutbox()}
                style={{
                  backgroundColor: "#2f3542",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>
                  Refresh Outbox ({outboxCount})
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => void flushOutbox()}
                style={{
                  backgroundColor: "#2f3542",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>
                  Flush Outbox
                </Text>
              </Pressable>
            </View>

            {lastFlush ? (
              <Text style={{ marginTop: 8, color: "#2f3542" }}>
                {lastFlush}
              </Text>
            ) : null}
          </View>
        ) : null}
        <TaskActivityModule
          disableSafeAreaTopInset={true}
          resetSignal={resetSignal}
        />
      </View>
    );
  }

  // Standalone mode: fully self-contained wrapper (copy/paste for LX).
  return (
    <SafeAreaProvider>
      <TranslationProvider>
        <AmplifyProvider autoStartDataStore={false}>
          <View style={{ flex: 1 }}>
            {enableTempAnswerSyncDemo ? (
              <View style={{ padding: 12 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void refreshOutbox()}
                    style={{
                      backgroundColor: "#2f3542",
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "600" }}>
                      Refresh Outbox ({outboxCount})
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void flushOutbox()}
                    style={{
                      backgroundColor: "#2f3542",
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "600" }}>
                      Flush Outbox
                    </Text>
                  </Pressable>
                </View>

                {lastFlush ? (
                  <Text style={{ marginTop: 8, color: "#2f3542" }}>
                    {lastFlush}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <TaskActivityModule
              disableSafeAreaTopInset={true}
              resetSignal={resetSignal}
            />
          </View>
        </AmplifyProvider>
      </TranslationProvider>
    </SafeAreaProvider>
  );
}
