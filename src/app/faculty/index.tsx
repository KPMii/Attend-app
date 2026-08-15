import { logoutAndRedirect } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../../stores/authStore";

export default function FacultyHome() {
  const [showName, setShowName] = useState("Guest");

  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const role = useAuthStore((s) => s.role);
  const isStudentCouncil = role === "student_council_officer";

  const handleLogout = async () => {
    await logoutAndRedirect();
  };

  const loadName = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading name:", error);
      return;
    }

    if (data) {
      setShowName(data.full_name ?? "Guest");
    }
  };

  useEffect(() => {
    loadName();
  }, []);

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#4361EE" />

        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logoEmoji}
            />
          </View>

          <Text style={styles.headerTitle}>
            {isStudentCouncil ? "Student Council" : "Faculty Home"}
          </Text>

          <View style={styles.greetingCard}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.greetingName}>{showName}</Text>
            <Text style={styles.greetingDate}>{today}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.startCard}
            onPress={() => router.push("/faculty/qrgenerator")}
          >
            <Text style={styles.startTitle}>Start Session</Text>
            <Text style={styles.startSub}>
              Create a new attendance session and Generate a QR Code
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Management</Text>
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => router.push("/faculty/sessions")}
            >
              <Image
                source={require("../assets/icons/SessionHistory.png")}
                style={styles.pillEmoji}
              />
              <Text style={styles.pillLabel}>Session{"\n"}History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => router.push("/faculty/students")}
            >
              <Image
                source={require("../assets/icons/Users.png")}
                style={styles.pillEmoji}
              />
              <Text style={styles.pillLabel}>Students</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pill}
              onPress={() => router.push("/faculty/reports")}
            >
              <Image
                source={require("../assets/icons/Document.png")}
                style={styles.pillEmoji}
              />
              <Text style={styles.pillLabel}>Reports</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.listGroup}>
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => router.push("/faculty/profile")}
            >
              <Image
                source={require("../assets/icons/Profile.png")}
                style={styles.listIcon}
              />
              <Text style={styles.listLabel}>My Profile</Text>
              <Text style={styles.listChevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => router.push("/faculty/settings")}
            >
              <Image
                source={require("../assets/icons/Settings.png")}
                style={styles.listIcon}
              />
              <Text style={styles.listLabel}>Settings</Text>
              <Text style={styles.listChevron}>›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomBox}>
          <Text></Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const BLUE = "#4361EE";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#F4F5FA";
const DARK_GRAY = "#1a1a1a";
const MEDIUM_GRAY = "#9a9a9a";
const RED = "#F2534D";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BLUE,
  },
  root: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
  },
  header: {
    backgroundColor: BLUE,
    paddingHorizontal: 24,
  },
  bottomBox: {
    backgroundColor: BLUE,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoEmoji: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  greetingCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    marginBottom: -44,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  greetingText: {
    color: DARK_GRAY,
    fontSize: 15,
  },
  greetingName: {
    color: DARK_GRAY,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  greetingDate: {
    color: MEDIUM_GRAY,
    fontSize: 13,
    marginTop: 8,
  },
  body: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: DARK_GRAY,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4,
  },
  startCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  startTitle: {
    color: DARK_GRAY,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6,
  },
  startSub: {
    color: MEDIUM_GRAY,
    fontSize: 14,
    lineHeight: 20,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  pill: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    marginHorizontal: 4,
  },
  pillEmoji: {
    width: 24,
    height: 24,
  },
  pillLabel: {
    color: DARK_GRAY,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  listGroup: {
    backgroundColor: WHITE,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  listIcon: {
    height: 24,
    width: 24,
  },
  listLabel: {
    flex: 1,
    color: DARK_GRAY,
    fontSize: 15,
    fontWeight: "600",
  },
  listChevron: {
    color: "#c0c0c0",
    fontSize: 22,
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 100,
  },
  logoutBtn: {
    backgroundColor: WHITE,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  logoutText: {
    color: RED,
    fontSize: 15,
    fontWeight: "700",
  },
});
