import { useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../../stores/authStore";

const QRLanding = () => {
  const [permission, reqPermission] = useCameraPermissions();
  const fullName = useAuthStore((s) => s.fullName);
  const schoolIdNo = useAuthStore((s) => s.schoolIdNo);

  const isPermissionGranted = Boolean(permission?.granted);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileCard}>
        <Text style={styles.profileName}>{fullName ?? "Student"}</Text>
        <Text style={styles.profileId}>ID: {schoolIdNo ?? "—"}</Text>
      </View>

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
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D0D0D",
    gap: 16,
    paddingHorizontal: 24,
  },
  profileCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  profileName: { color: "#fff", fontSize: 18, fontWeight: "700" },
  profileId: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  button: {
    color: "#C8F04D",
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 12,
  },
});

export default QRLanding;