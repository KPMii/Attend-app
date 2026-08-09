import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../../../stores/authStore";
import { logout } from "../../../lib/auth";

export default function StudentCouncilHome() {
  const router = useRouter();
  const fullName = useAuthStore((s) => s.fullName);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Student Council</Text>
            <Text style={styles.subtitle}>{fullName}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {hasPermission("sessions:create_event") && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/faculty/qrgenerator")}
          >
            <Text style={styles.cardEmoji}>📱</Text>
            <Text style={styles.cardTitle}>Start Event Session</Text>
            <Text style={styles.cardSub}>Generate QR for an event</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/faculty/student-council/event-history")}
        >
          <Text style={styles.cardEmoji}>🕓</Text>
          <Text style={styles.cardTitle}>Event History</Text>
          <Text style={styles.cardSub}>View past events, resume or export</Text>
        </TouchableOpacity>

        {hasPermission("audit:view") && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/admin/audit")}
          >
            <Text style={styles.cardEmoji}>📋</Text>
            <Text style={styles.cardTitle}>Audit Log</Text>
            <Text style={styles.cardSub}>View activity history</Text>
          </TouchableOpacity>
        )}

        {hasPermission("reports:export") && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/faculty/reports")}
          >
            <Text style={styles.cardEmoji}>📄</Text>
            <Text style={styles.cardTitle}>Reports &amp; Export</Text>
            <Text style={styles.cardSub}>
              Generate CSV, Excel &amp; PDF reports
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: "rgba(242,129,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutBtnText: { color: "#F2816B", fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  cardEmoji: { fontSize: 32, marginBottom: 4 },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
});
