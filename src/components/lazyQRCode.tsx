import QRCode from "react-native-qrcode-svg";

/**
 * LazyQRCode - offline-safe QR renderer.
 *
 * Previously this used a dynamic import() of react-native-qrcode-svg to defer
 * loading. In React Native that splits the module into an async chunk which is
 * fetched over the network from the bundler (dev server / web), so QR
 * generation failed when the device was offline or on a slow connection.
 *
 * A static import keeps react-native-qrcode-svg (and react-native-svg) bundled
 * directly into the app, so the QR code always renders - no internet required.
 */

interface LazyQRCodeProps {
  value: string;
  size: number;
  color?: string;
  backgroundColor?: string;
}

export function LazyQRCode({
  value,
  size,
  color = "#0D0D0D",
  backgroundColor = "#FFFFFF",
}: LazyQRCodeProps) {
  return (
    <QRCode
      value={value}
      size={size}
      color={color}
      backgroundColor={backgroundColor}
    />
  );
}