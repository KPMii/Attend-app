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
const INK = "#171C2E";
const BORDER = "#F1F1F6";

export default function AdminSettings() {
  const fullName = useAuthStore((s) => s.fullName);
  const role = useAuthStore((s) => s.role);
  const schoolIdNo = useAuthStore((s) => s.schoolIdNo);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconContainer}>
              <Image
                source={require("../assets/logo.png")}
                style={styles.logo}
              />
            </View>
          </View>
        </View>

        <View style={styles.titlePill}>
          <Text style={styles.titleName}>{fullName}</Text>
          <Text style={styles.titleRole}>Role: {role}</Text>
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

        <View style={styles.hiddenInfo}>
          <Text>{fullName ?? "Admin User"}</Text>
          <Text>{role ?? "admin"}</Text>
          {schoolIdNo && <Text>{schoolIdNo}</Text>}
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.75}
            onPress={logoutAndRedirect}
          >
            <Image />

            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  scroll: {
    paddingBottom: 40,
  },

  header: {
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: WHITE,
    marginTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    justifyContent: "center",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  logoIconContainer: {
    width: 30,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  titlePill: {
    marginHorizontal: 20,
    marginTop: 24,
    height: 86,
    borderRadius: 24,
    backgroundColor: FADED_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    marginLeft: 16,
    width: 48,
    height: 48,
  },

  titleRole: {
    fontSize: 16,
    fontWeight: "bold",
    color: INK,
    fontFamily: "Inter_400Regular",
  },

  titleName: {
    fontSize: 16,
    fontWeight: "bold",
    color: INK,
    fontFamily: "Inter_400Regular",
  },

  sectionCard: {
    marginHorizontal: 20,
    marginTop: 24,
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
    marginBottom: 8,
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

  hiddenInfo: {
    display: "none",
  },

  logoutContainer: {
    marginHorizontal: 20,
    marginTop: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#fff",
  },

  logoutButton: {
    height: 57,
    borderRadius: 12,
    backgroundColor: "#FFD8D4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  logoutText: {
    fontSize: 15,
    color: "#D90000",
    fontFamily: "Inter_400Regular",
  },
});