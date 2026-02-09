/**
 * Development tools screen with data source toggle and debugging utilities.
 *
 * This screen provides tools for:
 * - Switching between static and LX data sources
 * - Loading fixtures
 * - Viewing data source status
 * - Testing and validation
 */

import React from "react";
import { View, ScrollView, StyleSheet, Text } from "react-native";
import { DataSourceManager } from "@components/dev/DataSourceManager";
import { AppColors } from "@constants/AppColors";

/**
 * Development tools screen.
 *
 * Add this screen to your navigation for easy access to data source controls.
 *
 * @example
 * ```tsx
 * // In your navigation setup:
 * <Stack.Screen name="DevTools" component={DevToolsScreen} />
 * ```
 */
export const DevToolsScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Development Tools</Text>
        <Text style={styles.subtitle}>
          Test and validate task-system with different data sources
        </Text>
      </View>

      {/* Data Source Manager */}
      <DataSourceManager showDetails />

      {/* Additional dev tools can be added here */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionText}>
          Use the controls above to switch between static fixtures and LX
          production data.
        </Text>
        <Text style={styles.sectionText}>
          Navigate to the task list to see how tasks render with each data
          source.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.white,
  },
  header: {
    padding: 20,
    backgroundColor: AppColors.CIBlue,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.white,
    opacity: 0.9,
  },
  section: {
    padding: 16,
    marginTop: 16,
    backgroundColor: AppColors.powderGray,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.darkGray,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: AppColors.mediumDarkGray,
    marginBottom: 8,
    lineHeight: 20,
  },
});
