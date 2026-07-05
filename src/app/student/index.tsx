import { useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const QRLanding = () => {
  const [permission, reqPermission] = useCameraPermissions();

  const isPermissionGranted = Boolean(permission?.granted);

  return (
    <SafeAreaView className="flex-1 items-center justify-center">
      <TouchableOpacity onPress={reqPermission}>
        <Text style={styles.button}>Request Permission</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/student/scanner/QRScanner")}
        disabled={!isPermissionGranted}
      >
        <Text
          style={[styles.button, { opacity: !isPermissionGranted ? 0.5 : 1 }]}
        >
          Scan QR
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  button: {},
});

export default QRLanding;
