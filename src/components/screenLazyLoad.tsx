import { useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * ScreenLoading - a full-screen skeleton layout that shows
 * while a route or heavy component is being loaded.
 */
export function ScreenLoading({ label = "" }: { label?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSubtitle} />
      </View>

      <View style={styles.skeletonContent}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <View style={styles.skeletonCircle} />
            <View style={styles.skeletonTextBlock}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: "60%" }]} />
            </View>
          </View>
        ))}
      </View>

      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    padding: 24,
  },
  skeletonHeader: {
    marginBottom: 32,
    gap: 8,
  },
  skeletonTitle: {
    width: "60%",
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  skeletonSubtitle: {
    width: "40%",
    height: 14,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  skeletonContent: {
    gap: 12,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
  },
  skeletonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  skeletonTextBlock: {
    flex: 1,
    gap: 6,
  },
  skeletonLine: {
    width: "80%",
    height: 12,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  label: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
  },
});

/**
 * A hook that preloads data on screen focus for instant transitions.
 * Call this in screens that fetch data on mount.
 */
export function usePreloadData(fetcher: () => Promise<void>) {
  const [loaded, setLoaded] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!loaded) {
        fetcher().finally(() => setLoaded(true));
      }
    }, [loaded]),
  );

  return loaded;
}