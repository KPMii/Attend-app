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
      <StatusBar barStyle="dark-content" backgroundColor="#FBFBFF" />
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

        <TouchableOpacity style={styles.logoutBtn} onPress={logoutAndRedirect}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBFBFF" },
  scroll: { padding: 24, paddingBottom: 48, gap: 8 },
  title: {
    marginTop: 36,
    color: "#17181C",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 12,
    fontFamily: "Inter_400Regular",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ECECE7",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F0F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#305CDE",
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_400Regular",
  },
  infoRow: { flex: 1, gap: 2 },
  name: {
    color: "#17181C",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  meta: {
    color: "#85899B",
    fontSize: 12,
    textTransform: "capitalize",
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    color: "#85899B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 6,
    fontFamily: "Inter_400Regular",
  },
  logoutBtn: {
    marginTop: 24,
    backgroundColor: "#FFD8D4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutBtnText: {
    color: "#D90000",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
});
