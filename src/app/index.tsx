import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function RoleSelect() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Attend</Text>
        <Text style={styles.subtitle}>Choose how you'd like to sign in</Text>

        <TouchableOpacity
          style={[styles.card, styles.facultyCard]}
          onPress={() => router.push("/faculty/login")}
        >
          <Text style={styles.cardEmoji}>🧑‍🏫</Text>
          <Text style={styles.cardTitle}>I'm Faculty</Text>
          <Text style={styles.cardSub}>Start sessions, view attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.studentCard]}
          onPress={() => router.push("/student/login")}
        >
          <Text style={styles.cardEmoji}>🎓</Text>
          <Text style={styles.cardTitle}>I'm a Student</Text>
          <Text style={styles.cardSub}>Scan QR to mark attendance</Text>
        </TouchableOpacity>
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
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  facultyCard: {
    backgroundColor: "rgba(200,240,77,0.08)",
    borderColor: "rgba(200,240,77,0.25)",
  },
  studentCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardEmoji: { fontSize: 32, marginBottom: 4 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
});
