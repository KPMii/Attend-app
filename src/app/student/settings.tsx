import { Stack } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import ChangePasswordForm from "../../components/changePasswordForm";
import EditDisplayName from "../../components/editDisplayName";
import { logoutAndRedirect } from "../../lib/navigation";

export default function StudentSettings() {
  const fullName = useAuthStore((s) => s.fullName);
  const role = useAuthStore((s) => s.role);
  const schoolIdNo = useAuthStore((s) => s.schoolIdNo);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Settings" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(fullName ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.name}>{fullName ?? "—"}</Text>
            <Text style={styles.meta}>
              Role: {(role ?? "—").replace(/_/g, " ")}
            </Text>
            {schoolIdNo && <Text style={styles.meta}>ID: {schoolIdNo}</Text>}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Profile</Text>
        <EditDisplayName />

        <Text style={styles.sectionTitle}>Security</Text>
        <ChangePasswordForm />

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logoutAndRedirect}
        >
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, paddingBottom: 48, gap: 8 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(200,240,77,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#C8F04D", fontSize: 22, fontWeight: "800" },
  infoRow: { flex: 1, gap: 2 },
  name: { color: "#fff", fontSize: 17, fontWeight: "700" },
  meta: { color: "rgba(255,255,255,0.4)", fontSize: 12, textTransform: "capitalize" },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 6,
  },
  logoutBtn: {
    marginTop: 24,
    backgroundColor: "rgba(242,129,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.3)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutBtnText: { color: "#F2816B", fontSize: 14, fontWeight: "700" },
});
