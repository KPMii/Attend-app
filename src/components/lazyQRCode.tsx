import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * LazyQRCode — defers loading the heavy react-native-qrcode-svg library
 * until the user actually starts a session.
 *
 * react-native-qrcode-svg depends on react-native-svg which is a heavy module.
 * By deferring it, we keep the initial bundle small.
 */

interface LazyQRCodeProps {
  value: string;
  size: number;
  color?: string;
  backgroundColor?: string;
}

/**
 * Renders a placeholder QR code while the real QR library loads,
 * then swaps in the actual component.
 */
export function LazyQRCode({
  value,
  size,
  color = "#0D0D0D",
  backgroundColor = "#FFFFFF",
}: LazyQRCodeProps) {
  const [QRCodeModule, setQRCodeModule] = React.useState<any>(null);
  const [error, setError] = React.useState<boolean>(false);

  React.useEffect(() => {
    let cancelled = false;

    // 🚀 Dynamic import — defers loading react-native-qrcode-svg + react-native-svg
    import("react-native-qrcode-svg")
      .then((mod) => {
        if (!cancelled) {
          setQRCodeModule(() => mod.default);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[Lazy] QRCode load failed:", err);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    // Fallback: show a visual placeholder instead of crashing
    return (
      <View
        style={[
          styles.fallbackContainer,
          {
            width: size,
            height: size,
            backgroundColor,
          },
        ]}
      >
        <Text style={[styles.fallbackText, { color }]}>QR</Text>
        <Text style={[styles.fallbackSubtext, { color: color + "66" }]}>
          {value.slice(0, 20)}...
        </Text>
      </View>
    );
  }

  if (!QRCodeModule) {
    // 🔄 Loading state: show animated placeholder
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <View style={styles.pulsingSquare} />
        <Text style={styles.loadingHint}>Loading QR...</Text>
      </View>
    );
  }

  // ✅ Render the real QR code
  return React.createElement(QRCodeModule, {
    value,
    size,
    color,
    backgroundColor,
  });
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    gap: 12,
  },
  pulsingSquare: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(200,240,77,0.2)",
  },
  loadingHint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
  },
  fallbackContainer: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    overflow: "hidden",
    padding: 8,
  },
  fallbackText: {
    fontSize: 24,
    fontWeight: "800",
  },
  fallbackSubtext: {
    fontSize: 8,
    marginTop: 4,
    textAlign: "center",
  },
});
