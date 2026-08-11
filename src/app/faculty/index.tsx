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

export default function FacultyHome() {
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const role = useAuthStore((s) => s.role);
  const isStudentCouncil = role === "student_council_officer";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
      <View style={styles.blueBox}>
        <Text style={styles.title}>{isStudentCouncil ? "Student Council" : "Faculty Home"}</Text>
      </View>
        <Text>Quick Action</Text>

        {(hasPermission("sessions:create_event") || hasPermission("sessions:create_class")) && (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/faculty/qrgenerator")}
          >
            <Text style={styles.cardEmoji}>📱</Text>
            <Text style={styles.cardTitle}>{isStudentCouncil ? "New Event Session" : "Start Session"}</Text>
            <Text style={styles.cardSub}>Start Session</Text>
            <Text style={styles.cardSub}>Create a new attendance session and Generate a QR Code</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/faculty/students")}
        >
          <Text style={styles.cardEmoji}>🎓</Text>
          <Text style={styles.cardTitle}>Manage Students</Text>
          <Text style={styles.cardSub}>Edit profiles, view attendance</Text>
        </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: "#FDFFF5" },
  blueBox: {color: "#305CDE", flex: 1},
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
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