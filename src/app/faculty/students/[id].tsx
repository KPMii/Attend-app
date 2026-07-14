import { useLocalSearchParams, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

type AttendanceRecord = {
  id: string;
  status: string;
  scanned_at: string;
  sessions: { subject: string; room: string; created_at: string } | null;
};

export default function StudentDetailReadOnly() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [fullName, setFullName] = useState("");
  const [schoolIdNo, setSchoolIdNo] = useState("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadProfile();
    loadAttendance();
  }, [id]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, school_id_no")
      .eq("id", id)
      .single();
    if (data) {
      setFullName(data.full_name ?? "");
      setSchoolIdNo(data.school_id_no ?? "");
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("attendance")
      .select("id, status, scanned_at, sessions(subject, room, created_at)")
      .eq("student_id", id)
      .order("scanned_at", { ascending: false })
      .limit(50);
    if (data) setRecords(data as any);
    setLoading(false);
  };

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Student Detail" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.idText}>School ID: {schoolIdNo}</Text>
          <Text style={styles.hint}>Contact your admin to edit this record.</Text>
        </View>

        <Text style={styles.sectionTitle}>Attendance Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#F2816B" }]}>{lateCount}</Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Attendance</Text>
        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : records.length === 0 ? (
          <Text style={styles.empty}>No attendance records yet</Text>
        ) : (
          records.map((r) => (
            <View key={r.id} style={styles.recordRow}>
              <View>
                <Text style={styles.recordSubject}>{r.sessions?.subject ?? "Unknown"}</Text>
                <Text style={styles.recordMeta}>
                  {r.sessions?.room ?? ""} · {new Date(r.scanned_at).toLocaleString()}
                </Text>
              </View>
              <Text style={[styles.statusBadge, { color: r.status === "late" ? "#F2816B" : "#C8F04D" }]}>
                {r.status === "late" ? "Late" : "Present"}
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
  scroll: { padding: 24, gap: 12, paddingBottom: 48 },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "700",
    letterSpacing: 0.5, textTransform: "uppercase", marginTop: 16,
  },
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, gap: 4 },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
  idText: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  hint: { color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 8, fontStyle: "italic" },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryBox: { flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, alignItems: "center" },
  summaryNumber: { color: "#C8F04D", fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  recordRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14, marginBottom: 8,
  },
  recordSubject: { color: "#fff", fontSize: 14, fontWeight: "600" },
  recordMeta: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: "700" },
  empty: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 8 },
});