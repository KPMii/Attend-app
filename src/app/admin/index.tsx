import { logoutAndRedirect } from "@/lib/navigation";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { supabase } from "../../lib/supabase";

export default function AdminHome() {
  const router = useRouter();

  const [stats, setStats] = useState({
    students: 0,
    faculty: 0,
    subjects: 0,
    sections: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [
      { count: students },
      { count: faculty },
      { count: subjects },
      { count: sections },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("role", ["student", "student_council_officer"]),

      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "faculty"),

      supabase.from("subjects").select("*", { count: "exact", head: true }),

      supabase.from("sections").select("*", { count: "exact", head: true }),
    ]);

    setStats({
      students: students ?? 0,
      faculty: faculty ?? 0,
      subjects: subjects ?? 0,
      sections: sections ?? 0,
    });
  };

  useFocusEffect(useCallback(() => {loadStats()}, []))

  const handleLogout = async () => {
    await logoutAndRedirect();
  };

  const menuItems = [
    {
      title: "Students",
      image: require("../assets/icons/students.png"),
      route: "/admin/students",
    },
    {
      title: "Faculty",
      image: require("../assets/icons/dude-whiteboard.png"),
      route: "/admin/faculty",
    },
    {
      title: "Assignments",
      image: require("../assets/icons/user-check.png"),
      route: "/admin/faculty-assignments",
    },
    {
      title: "Subjects",
      image: require("../assets/icons/book.png"),
      route: "/admin/subjects",
    },
    {
      title: "Sections",
      image: require("../assets/icons/gird.png"),
      route: "/admin/sections",
    },
    {
      title: "Events",
      image: require("../assets/icons/event.png"),
      route: "/admin/events",
    },
    {
      title: "Audit Log",
      image: require("../assets/icons/spreadsheet.png"),
      route: "/admin/audit",
    },
    {
      title: "Reports",
      image: require("../assets/icons/Document.png"),
      route: "/admin/reports",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconContainer}>
              <Image
                style={styles.Logo}
                source={require("../assets/logo.png")}
              />
            </View>
          </View>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>System overview and management.</Text>
        </View>

        <Text style={styles.sectionTitle}>OVERVIEW</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statDecoration} />

            <View style={styles.statHeader}>
              <Image
                style={styles.Icons}
                source={require("../assets/icons/Users.png")}
              />
              <Text style={styles.statLabel}>Students</Text>
            </View>

            <Text style={styles.statNumber}>
              {stats.students.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statDecoration} />

            <View style={styles.statHeader}>
              <Image
                style={styles.Icons}
                source={require("../assets/icons/personal-card.png")}
              />
              <Text style={styles.statLabel}>Faculty</Text>
            </View>

            <Text style={styles.statNumber}>
              {stats.faculty.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statDecoration} />

            <View style={styles.statHeader}>
              <Image
                style={styles.Icons}
                source={require("../assets/icons/book.png")}
              />
              <Text style={styles.statLabel}>Subjects</Text>
            </View>

            <Text style={styles.statNumber}>
              {stats.subjects.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statDecoration} />

            <View style={styles.statHeader}>
              <Image
                style={styles.Icons}
                source={require("../assets/icons/book.png")}
              />
              <Text style={styles.statLabel}>Sections</Text>
            </View>

            <Text style={styles.statNumber}>
              {stats.sections.toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>MANAGEMENT</Text>

        <View style={styles.managementGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.managementCard}
              activeOpacity={0.7}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.managementIcon}>
                <Image source={item.image} style={styles.Icons} />
              </View>

              <Text style={styles.managementText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>SYSTEM</Text>

        <View style={styles.systemCard}>
          <TouchableOpacity
            style={styles.systemRow}
            activeOpacity={0.7}
            onPress={() => router.push("/admin/settings" as any)}
          >
            <View style={styles.systemLeft}>
              <Image
                style={styles.Icons}
                source={require("../assets/icons/Settings.png")}
              />
              <Text style={styles.systemText}>Settings</Text>
            </View>

            <Image
              style={styles.Icons}
              source={require("../assets/icons/Right Arrow.png")}
            />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.systemRow}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={styles.systemLeft}>
              <Text style={styles.logoutText}>Log Out</Text>
            </View>
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
    paddingBottom: 35,
  },

  header: {
    marginTop: 30,
    height: 74,
    paddingHorizontal: 28,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F6",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  logoIconContainer: {
    width: 30,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  Logo: {
    marginLeft: 16,
    width: 48,
    height: 48,
  },

  titleContainer: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 31,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#171C2E",
    fontFamily: "Inter_400Regular",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 15,
    color: "#626575",
    fontFamily: "Inter_400Regular",
  },

  sectionTitle: {
    marginHorizontal: 28,
    marginBottom: 10,
    fontSize: 13,
    letterSpacing: 1,
    color: "#555967",
    fontFamily: "Inter_400Regular",
  },

  statsGrid: {
    paddingHorizontal: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 38,
  },

  statBox: {
    width: "48%",
    height: 113,
    borderRadius: 12,
    backgroundColor: "#E8EBFF",
    padding: 15,
    marginBottom: 11,

    overflow: "hidden",
  },

  statDecoration: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: 50,
    right: -16,
    top: -30,
    backgroundColor: "#DDE2FF",
  },

  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statLabel: {
    fontSize: 12,
    color: "#545969",
    fontFamily: "Inter_400Regular",
  },

  statNumber: {
    marginTop: 8,
    fontSize: 43,
    lineHeight: 48,
    fontWeight: "500",
    color: "#141A2D",
    fontFamily: "Inter_400Regular",
  },

  managementGrid: {
    paddingHorizontal: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 34,
  },

  managementCard: {
    width: "48%",
    height: 112,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#FCFCFF",
    borderColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  managementIcon: {
    width: 48,
    height: 48,
    borderRadius: 25,
    backgroundColor: "#E9EDFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  managementText: {
    fontSize: 14,
    color: "#171C2E",
    fontFamily: "Inter_400Regular",
  },

  systemCard: {
    marginHorizontal: 28,
    borderRadius: 12,
    backgroundColor: "#FCFCFF",
    borderWidth: 1,
    borderColor: "#F0F0F7",
    overflow: "hidden",
  },

  systemRow: {
    minHeight: 59,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  systemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  systemText: {
    fontSize: 15,
    color: "#303445",
    fontFamily: "Inter_400Regular",
  },

  logoutText: {
    fontSize: 15,
    color: "#E00000",
    fontFamily: "Inter_400Regular",
  },

  divider: {
    height: 1,
    backgroundColor: "#E3E5F0",
    marginHorizontal: 48,
  },

  Icons: {
    width: 20,
    height: 20,
  },
});
