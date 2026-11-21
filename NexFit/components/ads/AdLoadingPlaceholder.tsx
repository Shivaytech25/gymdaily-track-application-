import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants/theme";

interface AdLoadingPlaceholderProps {
  height?: number;
}

export const AdLoadingPlaceholder: React.FC<AdLoadingPlaceholderProps> = ({
  height = 50,
}) => {
  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>SPONSORED</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  badgeText: {
    fontSize: 9,
    color: "#64748b",
    letterSpacing: 1,
    fontWeight: "600",
  },
});
