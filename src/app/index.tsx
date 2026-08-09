import { useRouter } from "expo-router";
import {
  Image,
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
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Choose how you'd like to sign in</Text>

        <Image
          source={require("./assets/logo.png")}
          style={{
            width: 215,
            height: 210,
          }}
        />

        <TouchableOpacity
          style={[styles.card, styles.facultyCard]}
          onPress={() => router.push("/student/login")}
        >
          <Text style={styles.cardText}>Student</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.studentCard]}
          onPress={() => router.push("/faculty/login")}
        >
          <Text style={styles.cardText}>Faculty</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9FF" },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    color: "#000000",
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 100,
    paddingVertical: 15,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  facultyCard: {
    backgroundColor: "#305CDE",
    borderColor: "rgba(200,240,77,0.25)",
  },
  studentCard: {
    backgroundColor: "#305CDE",
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardText: { color: "#FFFFFF", fontSize: 13, fontWeight: "bold" },
});
