import { Stack } from "expo-router";
import {
  Image,
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

const FADED_BLUE = "#F0F3FF";
const BG = "#FBFBFF";
const WHITE = "#FFFFFF";
const INK = "#17181C";
const MUTED = "#85899B";
const BORDER = "#ECECE7";

export default function StudentSettings() {
  const fullName = useAuthStore((s) => s.fullName);
  const role = useAuthStore((s) => s.role);
  const schoolIdNo = useAuthStore((s) => s.schoolIdNo);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Settings" }} />
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.name}>{fullName ?? "—"}</Text>
            <Text style={styles.meta}>
              Role: {(role ?? "—").replace(/_/g, " ")}
            </Text>
            {schoolIdNo && <Text style={styles.meta}>ID: {schoolIdNo}</Text>}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Image
                source={require("../assets/icons/Profile.png")}
                style={styles.sectionIcon}
              />
            </View>
            <Text style={styles.sectionHeading}>Profile</Text>
          </View>

          <Text style={styles.fieldLabel}>Display Name</Text>
          <EditDisplayName />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Image
                source={require("../assets/icons/keyLock.png")}
                style={styles.sectionIcon}
              />
            </View>
            <Text style={styles.sectionHeading}>Security</Text>
          </View>
          <ChangePasswordForm />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logoutAndRedirect}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 24, paddingBottom: 48, gap: 8 },
  title: {
    marginTop: 36,
    color: INK,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 12,
    fontFamily: "Inter_400Regular",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  infoRow: { flex: 1, gap: 2, marginLeft: 8 },
  name: {
    color: INK,
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  meta: {
    color: MUTED,
    fontSize: 12,
    textTransform: "capitalize",
    fontFamily: "Inter_400Regular",
  },
  sectionCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FADED_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionIcon: {
    width: 14,
    height: 18,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: INK,
    fontFamily: "Inter_400Regular",
  },
  fieldLabel: {
    marginLeft: 3,
    fontSize: 12,
    fontWeight: "600",
    color: "#55596B",
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