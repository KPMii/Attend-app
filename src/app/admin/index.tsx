import { useRouter } from "expo-router";
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AdminHome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>Admin Panel</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/admin/subjects")}>
        <Text style={styles.cardEmoji}>📚</Text>
        <Text style={styles.cardTitle}>Subjects</Text>
        <Text style={styles.cardSub}>Manage the master subject list</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/admin/sections")}>
        <Text style={styles.cardEmoji}>🏫</Text>
        <Text style={styles.cardTitle}>Sections</Text>
        <Text style={styles.cardSub}>Manage sections, rooms, rosters</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/faculty/students")}>
        <Text style={styles.cardEmoji}>🎓</Text>
        <Text style={styles.cardTitle}>Students</Text>
        <Text style={styles.cardSub}>View and edit student profiles</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D", padding: 24, gap: 16 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 8 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 20,
    gap: 4,
  },
  cardEmoji: { fontSize: 28, marginBottom: 4 },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cardSub: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
});