import { CameraView } from "expo-camera";
import React from "react";

/**
 * LazyCameraView - offline-safe camera wrapper.
 *
 * Previously this used a dynamic import() of expo-camera to defer loading.
 * In React Native that splits the module into an async chunk which is fetched
 * over the network from the bundler (dev server / web), so the camera failed
 * to load when the device was offline or on a slow connection.
 *
 * A static import keeps expo-camera bundled directly into the app, so the
 * scanner always initializes - no internet required.
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

export const LazyCameraView = React.forwardRef<
  CameraViewRef,
  LazyCameraViewProps
>((props, ref) => {
  return <CameraView {...(props as any)} ref={ref as any} />;
});

LazyCameraView.displayName = "LazyCameraView";