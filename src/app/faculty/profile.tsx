import { Stack } from "expo-router";
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
import { useAuthStore } from "../../../stores/authStore";
import {
  getFacultyAssignments,
  type FacultyAssignment,
} from "../../lib/facultyAssignments";
import { logoutAndRedirect } from "../../lib/navigation";

const BLUE = "#305CDE";
const FADED_BLUE = "#F0F3FF";
const BG = "#FBFBFF";
const WHITE = "#FFFFFF";
const INK = "#171C2E";
const MUTED = "#85899B";
const BORDER = "#F1F1F6";
const RED_FILL = "#FFD8D4";
const RED = "#D90000";

export default function FacultyProfile() {
  const fullName = useAuthStore((s) => s.fullName);
  const userId = useAuthStore((s) => s.userId);
  const role = useAuthStore((s) => s.role);

  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    getFacultyAssignments(userId).then((data) => {
      setAssignments(data);
      setLoading(false);
    });
  }, [userId]);

  const uniqueSubjects = [
    ...new Map(
      assignments.map((a) => [a.subject_id, a.subject_name ?? ""]),
    ).values(),
  ];

  const roleLabel =
    role === "student_council_officer"
      ? "Student Council"
      : role === "admin"
        ? "Administrator"
        : "Faculty";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.hero}>
          <Text style={styles.name}>{fullName ?? "—"}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{roleLabel}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Subjects</Text>
            {loading ? (
              <Text style={styles.empty}>Loading...</Text>
            ) : uniqueSubjects.length === 0 ? (
              <Text style={styles.empty}>
                No subjects assigned yet. Ask your admin to assign your teaching
                load.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {uniqueSubjects.map((s, i) => (
                  <View key={`${s}-${i}`} style={styles.chip}>
                    <Text style={styles.chipText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Sections</Text>
            {loading ? (
              <Text style={styles.empty}>Loading...</Text>
            ) : assignments.length === 0 ? (
              <Text style={styles.empty}>No sections assigned yet.</Text>
            ) : (
              <View style={styles.list}>
                {assignments.map((a, idx) => (
                  <View
                    key={a.id}
                    style={[styles.row, idx > 0 && styles.rowDivider]}
                  >
                    <View style={styles.rowIcon}>
                      <Text style={styles.rowIconText}>
                        {(a.subject_name ?? "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowSubject}>{a.subject_name}</Text>
                      <Text style={styles.rowSection}>{a.section_name}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.8}
            onPress={async () => {
              await logoutAndRedirect();
            }}
          >
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BLUE },
  scroll: { paddingBottom: 48 },

  hero: {
    marginTop: 38,
    backgroundColor: BLUE,
    paddingTop: 28,
    paddingBottom: 68,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  name: {
    color: WHITE,
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "Inter_400Regular",
    marginTop: 16,
    textAlign: "center",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  badgeText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  meta: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    marginTop: 12,
  },

  body: {
    backgroundColor: BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  cardTitle: {
    color: INK,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: FADED_BLUE,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  list: { gap: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: FADED_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconText: {
    color: BLUE,
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Inter_400Regular",
  },
  rowText: { flex: 1 },
  rowSubject: {
    color: INK,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  rowSection: { color: MUTED, fontSize: 13, marginTop: 2 },

  empty: { color: MUTED, fontSize: 13, lineHeight: 19 },

  logoutBtn: {
    backgroundColor: RED_FILL,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  logoutBtnText: {
    color: RED,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
});