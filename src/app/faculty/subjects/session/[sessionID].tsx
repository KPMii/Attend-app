import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../../../../../lib/supabase";

type Row = {
  id: string;
  full_name: string;
  school_id_no: string | null;
  status: "present" | "late" | "absent";
};

export default function SessionAttendance() {
  const { id: subjectId, sessionId } = useLocalSearchParams<{
    id: string;
    sessionId: string;
  }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId || !sessionId) return;
    load();
  }, [subjectId, sessionId]);

  const load = async () => {
    setLoading(true);

    const { data: roster } = await supabase
      .from("subject_enrollments")
      .select("profiles(id, full_name, school_id_no)")
      .eq("subject_id", subjectId);

    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("session_id", sessionId);

    const attendanceMap = new Map(
      attendance?.map((a) => [a.student_id, a.status]) ?? [],
    );

    const combined: Row[] = (roster ?? []).map((r: any) => {
      const student = r.profiles;
      const status = attendanceMap.get(student.id) ?? "absent";
      return {
        id: student.id,
        full_name: student.full_name,
        school_id_no: student.school_id_no,
        status,
      };
    });

    combined.sort((a, b) => a.full_name.localeCompare(b.full_name));
    setRows(combined);
    setLoading(false);
  };

  const presentCount = rows.filter((r) => r.status === "present").length;
  const lateCount = rows.filter((r) => r.status === "late").length;
  const absentCount = rows.filter((r) => r.status === "absent").length;

  const statusColor = (s: string) =>
    s === "present" ? "#C8F04D" : s === "late" ? "#F2C14E" : "#F2816B";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Session Attendance" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#C8F04D" }]}>
              {presentCount}
            </Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#F2C14E" }]}>
              {lateCount}
            </Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#F2816B" }]}>
              {absentCount}
            </Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
        </View>

        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.row}>
              <View>
                <Text style={styles.name}>{r.full_name}</Text>
                <Text style={styles.idText}>{r.school_id_no}</Text>
              </View>
              <Text style={[styles.status, { color: statusColor(r.status) }]}>
                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, gap: 8, paddingBottom: 48 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  summaryNumber: { fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  name: { color: "#fff", fontSize: 14, fontWeight: "600" },
  idText: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  status: { fontSize: 13, fontWeight: "700" },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
});
