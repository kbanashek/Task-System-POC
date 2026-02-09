/**
 * Simple data source toggle UI.
 *
 * Provides a toggle to switch between data sources.
 * The host app is responsible for loading the actual fixture data.
 *
 * @example
 * ```tsx
 * <DataSourceProvider>
 *   <DataSourceManager />
 * </DataSourceProvider>
 * ```
 */

import { AppColors } from "@constants/AppColors";
import React from "react";
import { StyleSheet, View } from "react-native";
import { DataSourceToggle } from "./DataSourceToggle";

export interface DataSourceManagerProps {
  /** Show detailed controls and status (currently unused, for future expansion) */
  showDetails?: boolean;
  /**
   * Optional right-side accessory element (e.g., dev-only actions like "Clear DataStore").
   *
   * The host app provides this element; task-system just lays it out.
   */
  rightAccessory?: React.ReactNode;
}

/**
 * Data source manager component.
 *
 * Displays a toggle for switching between static and LX data sources.
 * The host application is responsible for:
 * - Loading fixture data when the source changes
 * - Handling errors during loading
 * - Managing the fixture import process
 *
 * @param props - Component props
 * @returns Data source manager UI
 */
export const DataSourceManager: React.FC<DataSourceManagerProps> = ({
  showDetails = true,
  rightAccessory,
}) => {
  return (
    <View style={styles.container}>
      <DataSourceToggle
        showCounts={showDetails}
        rightAccessory={rightAccessory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.powderGray,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.lightGray,
    paddingHorizontal: 8,
  },
});
