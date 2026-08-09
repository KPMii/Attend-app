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

export default function FacultyProfile() {
  const fullName = useAuthStore((s) => s.fullName);
  const schoolIdNo = useAuthStore((s) => s.schoolIdNo);
  const userId = useAuthStore((s) => s.userId);

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

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "My Profile" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(fullName ?? "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.name}>{fullName ?? "—"}</Text>
            <Text style={styles.meta}>ID: {schoolIdNo ?? "—"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>My Subjects</Text>
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

        <Text style={styles.sectionTitle}>My Sections</Text>
        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : assignments.length === 0 ? (
          <Text style={styles.empty}>No sections assigned yet.</Text>
        ) : (
          <View style={styles.list}>
            {assignments.map((a) => (
              <View key={a.id} style={styles.row}>
                <View>
                  <Text style={styles.rowSubject}>{a.subject_name}</Text>
                  <Text style={styles.rowSection}>{a.section_name}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await logoutAndRedirect();
          }}
        >
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, paddingBottom: 48 },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(200,240,77,0.15)",
    borderWidth: 1,
    borderColor: "rgba(200,240,77,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#C8F04D", fontSize: 26, fontWeight: "800" },
  name: { color: "#fff", fontSize: 20, fontWeight: "800" },
  meta: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 8,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "rgba(200,240,77,0.1)",
    borderWidth: 1,
    borderColor: "rgba(200,240,77,0.3)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { color: "#C8F04D", fontSize: 13, fontWeight: "700" },
  list: { gap: 8 },
  row: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
  },
  rowSubject: { color: "#fff", fontSize: 14, fontWeight: "600" },
  rowSection: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  empty: { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  logoutBtn: {
    backgroundColor: "rgba(242,129,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.3)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 32,
  },
  logoutBtnText: { color: "#F2816B", fontSize: 15, fontWeight: "700" },
});
