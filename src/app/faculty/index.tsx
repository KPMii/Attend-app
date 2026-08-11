import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { logout } from "../../lib/auth";

export default function FacultyHome() {
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const role = useAuthStore((s) => s.role);
  const isStudentCouncil = role === "student_council_officer";

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            {isStudentCouncil ? "Student Council" : "Faculty Home"}
          </Text>
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
            <Text style={styles.cardTitle}>
              {isStudentCouncil ? "New Event Session" : "Start Session"}
            </Text>
            <Text style={styles.cardSub}>Generate QR for attendance</Text>
          </TouchableOpacity>
        )}

        {!isStudentCouncil && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/faculty/students")}
          >
            <Text style={styles.cardEmoji}>🎓</Text>
            <Text style={styles.cardTitle}>Manage Students</Text>
            <Text style={styles.cardSub}>Edit profiles, view attendance</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/faculty/sessions")}
        >
          <Text style={styles.cardEmoji}>📋</Text>
          <Text style={styles.cardTitle}>Session History</Text>
          <Text style={styles.cardSub}>View past sessions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/faculty/reports")}
        >
          <Text style={styles.cardEmoji}>📄</Text>
          <Text style={styles.cardTitle}>My Reports</Text>
          <Text style={styles.cardSub}>
            Generate attendance PDFs for your classes
          </Text>
        </TouchableOpacity>

        {hasPermission("admin:access") && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/admin")}
          >
            <Text style={styles.cardEmoji}>⚙️</Text>
            <Text style={styles.cardTitle}>Admin Panel</Text>
            <Text style={styles.cardSub}>
              Manage subjects, sections, students
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9FF" },
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
    marginBottom: 16,
  },
  title: {
    color: "#000000",
    fontSize: 28,
    fontWeight: "800",
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
  cardTitle: { color: "#000000", fontSize: 17, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
});
