import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * LazyCameraView — wraps expo-camera's CameraView in a lazy-loading boundary.
 * The CameraView + barcode scanning is one of the heaviest modules.
 * This component defers its import until the user actually navigates to the scanner.
 */

interface LazyCameraViewProps {
  facing?: "front" | "back";
  onBarcodeScanned?: (data: { data: string }) => void;
  barcodeScannerSettings?: {
    barcodeTypes?: string[];
  };
  style?: any;
}

type CameraViewRef = any;

/**
 * A wrapper that lazily loads the CameraView.
 * Shows a stylish loading overlay while the camera module initializes.
 */
export const LazyCameraView = React.forwardRef<
  CameraViewRef,
  LazyCameraViewProps
>((props, ref) => {
  const [CameraModule, setCameraModule] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    import("expo-camera")
      .then((mod) => {
        if (!cancelled) {
          setCameraModule(() => mod.CameraView);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[Lazy] Camera load failed:", err);
          setError("Camera failed to load");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setError(null);
            setIsLoading(true);
            import("expo-camera")
              .then((mod) => setCameraModule(() => mod.CameraView))
              .catch(() => {
                setError("Still can't load camera");
                setIsLoading(false);
              });
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!CameraModule) {
    return (
      <View style={styles.placeholder}>
        <View style={styles.cameraIcon}>
          <Text style={styles.cameraEmoji}>📷</Text>
        </View>
        <Text style={styles.loadingText}>Starting camera...</Text>
      </View>
    );
  }

  return React.createElement(CameraModule, {
    ...props,
    ref,
  });
});

LazyCameraView.displayName = "LazyCameraView";

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    gap: 16,
  },
  cameraIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraEmoji: {
    fontSize: 28,
  },
  loadingText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },
  errorIcon: {
    fontSize: 36,
  },
  errorText: {
    color: "#F2816B",
    fontSize: 14,
    fontWeight: "600",
  },
  retryBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
