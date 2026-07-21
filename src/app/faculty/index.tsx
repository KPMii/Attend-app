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
  const role = useAuthStore((s) => s.role);

  // To check the role
  console.log("DEBUG current role:", role);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Faculty Home</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/faculty/qrgenerator")}
        >
          <Text style={styles.cardEmoji}>📱</Text>
          <Text style={styles.cardTitle}>Start Session</Text>
          <Text style={styles.cardSub}>Generate QR for attendance</Text>
        </TouchableOpacity>

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
          onPress={() => router.push("/faculty/reports")}
        >
          <Text style={styles.cardEmoji}>📄</Text>
          <Text style={styles.cardTitle}>My Reports</Text>
          <Text style={styles.cardSub}>
            Generate attendance PDFs for your classes
          </Text>
        </TouchableOpacity>

        {role === "admin" && (
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
  container: { flex: 1, backgroundColor: "#0D0D0D" },
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
