import { useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../../stores/authStore";
import { logoutAndRedirect } from "../../lib/navigation";

const QRLanding = () => {
  const [permission, reqPermission] = useCameraPermissions();
  const fullName = useAuthStore((s) => s.fullName);
  const schoolIdNo = useAuthStore((s) => s.schoolIdNo);

  const isPermissionGranted = Boolean(permission?.granted);

  const handleLogout = async () => {
    await logoutAndRedirect();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push("/student/settings" as any)}
        >
          <Text style={styles.settingsBtnText}>⚙️</Text>
        </TouchableOpacity>
      </View>
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

      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>Logout</Text>
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
  topBar: {
    position: "absolute",
    top: 12,
    right: 20,
  },
  settingsBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  settingsBtnText: { fontSize: 16 },
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
  logoutBtn: {
    backgroundColor: "rgba(242,129,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.3)",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  logoutBtnText: { color: "#F2816B", fontSize: 14, fontWeight: "700" },
});

export default QRLanding;
