import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

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
        .eq("role", "student"),
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

  const menuItems = [
    {
      emoji: "📚",
      title: "Subjects",
      sub: "Manage the master subject list",
      route: "/admin/subjects",
    },
    {
      emoji: "🏫",
      title: "Sections",
      sub: "Manage sections, rooms, rosters",
      route: "/admin/sections",
    },
    {
      emoji: "🎓",
      title: "Students",
      sub: "View and edit student profiles",
      route: "/admin/students",
    },
    {
      emoji: "👨‍🏫",
      title: "Faculty",
      sub: "View faculty accounts",
      route: "/admin/faculty",
    },
    {
      emoji: "📅",
      title: "Events",
      sub: "Create and manage school events",
      route: "/admin/events",
    },
    {
      emoji: "📋",
      title: "Audit Log",
      sub: "See who did what, and when",
      route: "/admin/audit",
    },
    {
      emoji: "📄",
      title: "Reports",
      sub: "Generate attendance PDF reports",
      route: "/admin/reports",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Admin Panel</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.students}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.faculty}</Text>
            <Text style={styles.statLabel}>Faculty</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.subjects}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.sections}</Text>
            <Text style={styles.statLabel}>Sections</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuRow}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  statNumber: { color: "#C8F04D", fontSize: 26, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  menu: { marginTop: 16, gap: 8 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
  },
  menuEmoji: { fontSize: 24 },
  menuText: { flex: 1 },
  menuTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  menuSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 20 },
});
