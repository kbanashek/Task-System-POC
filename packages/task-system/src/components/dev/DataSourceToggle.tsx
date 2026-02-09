/**
 * Toggle component for switching between static and LX fixture data sources.
 *
 * This is a development/testing tool that allows switching between different
 * data sources at runtime to validate compatibility.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useDataSource } from "@contexts/DataSourceContext";
import type { DataSourceType } from "@contexts/DataSourceContext";
import { AppColors } from "@constants/AppColors";

export interface DataSourceToggleProps {
  /** Show data counts for each source */
  showCounts?: boolean;
  /** Custom styles for the container */
  style?: object;
  /** Optional right-side accessory (e.g., dev-only actions) */
  rightAccessory?: React.ReactNode;
}

/**
 * Toggle component for switching between data sources.
 *
 * Displays the current active source and allows switching between
 * static fixtures and LX data.
 *
 * @example
 * ```tsx
 * <DataSourceToggle showCounts />
 * ```
 */
export const DataSourceToggle: React.FC<DataSourceToggleProps> = ({
  showCounts = true,
  style,
  rightAccessory,
}) => {
  const { activeSource, setActiveSource, fixtures, hasData } = useDataSource();

  const handleToggle = (source: DataSourceType): void => {
    if (hasData(source)) {
      setActiveSource(source);
    }
  };

  const getTaskCount = (source: DataSourceType): number => {
    return fixtures[source]?.tasks?.length ?? 0;
  };

  const isActive = (source: DataSourceType): boolean => {
    return activeSource === source;
  };

  const isDisabled = (source: DataSourceType): boolean => {
    return !hasData(source);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Data Source:</Text>
        {rightAccessory ? (
          <View style={styles.rightAccessory}>{rightAccessory}</View>
        ) : null}
      </View>

      <View style={styles.toggleContainer}>
        {/* Static Fixture Button */}
        <TouchableOpacity
          style={[
            styles.button,
            isActive("static") && styles.buttonActive,
            isDisabled("static") && styles.buttonDisabled,
          ]}
          onPress={() => handleToggle("static")}
          disabled={isDisabled("static")}
        >
          <Text
            style={[
              styles.buttonText,
              isActive("static") && styles.buttonTextActive,
              isDisabled("static") && styles.buttonTextDisabled,
            ]}
          >
            Static Fixture
          </Text>
          {showCounts && hasData("static") && (
            <Text
              style={[styles.count, isActive("static") && styles.countActive]}
            >
              {getTaskCount("static")} tasks
            </Text>
          )}
        </TouchableOpacity>

        {/* LX Data Button */}
        <TouchableOpacity
          style={[
            styles.button,
            isActive("lx") && styles.buttonActive,
            isDisabled("lx") && styles.buttonDisabled,
          ]}
          onPress={() => handleToggle("lx")}
          disabled={isDisabled("lx")}
        >
          <Text
            style={[
              styles.buttonText,
              isActive("lx") && styles.buttonTextActive,
              isDisabled("lx") && styles.buttonTextDisabled,
            ]}
          >
            LX Data
          </Text>
          {showCounts && hasData("lx") && (
            <Text style={[styles.count, isActive("lx") && styles.countActive]}>
              {getTaskCount("lx")} tasks
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Status indicator */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,
            hasData(activeSource) && styles.statusDotActive,
          ]}
        />
        <Text style={styles.statusText}>
          {hasData(activeSource)
            ? `${getTaskCount(activeSource)} tasks loaded`
            : "No data loaded"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: AppColors.lightGray,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.darkGray,
  },
  rightAccessory: {
    alignSelf: "flex-start",
  },
  toggleContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    backgroundColor: AppColors.powderGray,
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  buttonActive: {
    backgroundColor: AppColors.CIBlue,
    borderColor: AppColors.CIBlue,
  },
  buttonDisabled: {
    backgroundColor: AppColors.lightGray,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.darkGray,
  },
  buttonTextActive: {
    color: AppColors.white,
  },
  buttonTextDisabled: {
    color: AppColors.mediumDarkGray,
  },
  count: {
    fontSize: 12,
    color: AppColors.mediumDarkGray,
    marginTop: 4,
  },
  countActive: {
    color: AppColors.white,
    opacity: 0.9,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppColors.lightGray,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.mediumDarkGray,
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: AppColors.successGreen,
  },
  statusText: {
    fontSize: 12,
    color: AppColors.mediumDarkGray,
  },
});
