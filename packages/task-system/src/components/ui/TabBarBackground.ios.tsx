import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useColorScheme } from "@hooks/useColorScheme";

export default function BlurTabBarBackground() {
  const colorScheme = useColorScheme();
  // Use a simple opaque background instead of blur to avoid expo-blur dependency
  // This matches the native tab bar appearance on iOS without requiring expo-blur
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#f2f2f7",
        },
      ]}
    />
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
