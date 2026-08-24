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

export default function AdminSettings() {
  const fullName = useAuthStore((s) => s.fullName);
  const role = useAuthStore((s) => s.role);
  const schoolIdNo = useAuthStore((s) => s.schoolIdNo);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <StatusBar barStyle="dark-content" backgroundColor="#FBFBFF" />

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
            <Image />

            <View></View>
            <Text style={styles.sectionHeading}>Profile</Text>
          </View>

          <Text style={styles.fieldLabel}>Display Name</Text>
          <EditDisplayName />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Image />

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
    backgroundColor: "#FBFBFF",
  },

  scroll: {
    paddingBottom: 40,
  },

  header: {
    height: 64,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    marginTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F7",
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
    backgroundColor: "#D8E3FB",
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
    color: "#171C2E",
    fontFamily: "Inter_400Regular",
  },

  titleName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#171C2E",
    fontFamily: "Inter_400Regular",
  },

  sectionCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#D8E3FB",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },

  sectionHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    fontFamily: "Inter_400Regular",
  },

  fieldLabel: {
    marginLeft: 4,
    marginBottom: 7,
    fontSize: 12,
    color: "#555967",
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
