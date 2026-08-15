import { supabase } from "@/lib/supabase";
import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../../stores/authStore";
import { logoutAndRedirect } from "../../lib/navigation";

export default function StudentHome() {
  const [showName, setShowName] = useState("Guest");
  const cameraPerms = useCameraPermissions();

  const router = useRouter();
  const role = useAuthStore((s) => s.role);

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

          <Text style={styles.headerTitle}>Student Home</Text>

          <View style={styles.greetingCard}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.greetingName}>{showName}</Text>
            <Text style={styles.greetingDate}>{today}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionLabel}>Attendance</Text>
          <TouchableOpacity
            style={styles.startCard}
            onPress={() => router.push("/student/scanner/QRScanner")}
          >
            <Text style={styles.startTitle}>Scan Attendance QR</Text>
            <Text style={styles.startSub}>
              Scan the QR code shown by your instructor to record your
              attendance
            </Text>
          </TouchableOpacity>
          //HERE NOT DONE
          {cameraPerms && (
            <View>
              <Text style={styles.sectionLabel}>Camera Permission</Text>
              <TouchableOpacity style={styles.startCard}>
                <Text style={styles.startTitle}>Camera Access</Text>
                <Text style={styles.startSub}>
                  Required to start Attendance
                </Text>
                <Text style={styles.startSub}>Allow -›</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.listGroup}>
            <TouchableOpacity
              style={styles.listRow}
              onPress={() => router.push("/student/settings")}
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
