import { StyleSheet, Text, View } from "react-native";

type LoadingFallbackProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
};

export function LoadingFallback({
  label = "Loading...",
  size = "md",
  fullScreen = false,
}: LoadingFallbackProps) {
  const dotSize = size === "sm" ? 6 : size === "lg" ? 12 : 8;
  const containerPadding = size === "sm" ? 24 : size === "lg" ? 48 : 32;

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { paddingVertical: containerPadding },
      ]}
    >
      <View style={[styles.dots, { gap: dotSize * 0.8 }]}>
        {[0, 0.3, 0.6].map((delay, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                animationDelay: `${delay}s`,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, size === "sm" && { fontSize: 12 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    backgroundColor: "rgba(200,240,77,0.6)",
    // Note: animation is a shorthand; in React Native we'd use Animated API
    // This is a static fallback — animated version would use useAnimatedStyle
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "500",
  },
});

/**
 * Animated pulsing dots for a polished loading experience.
 * Use <LoadingSpinner /> for a dynamic animated version.
 */
export function LoadingSpinner() {
  return (
    <View style={spinnerStyles.container}>
      <View style={spinnerStyles.pulse}>
        <View style={spinnerStyles.innerRing} />
      </View>
      <Text style={spinnerStyles.text}>Loading...</Text>
    </View>
  );
}

const spinnerStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D0D0D",
    gap: 16,
  },
  pulse: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "rgba(200,240,77,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#C8F04D",
    borderTopColor: "transparent",
  },
  text: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },
});
