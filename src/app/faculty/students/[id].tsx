import { Stack, useLocalSearchParams } from "expo-router";
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
import { PAGE_SIZE, getRange } from "../../../lib/pagination";
import { supabase } from "../../../lib/supabase";

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
  const [studentSections, setStudentSections] = useState<
    { id: string; name: string }[]
  >([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    loadProfile();
    loadSections();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadAttendance();
  }, [id, page]);

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

  const loadSections = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("section_enrollments")
      .select("sections(id, name)")
      .eq("student_id", id);

    const names: { id: string; name: string }[] = (data ?? [])
      .map((e: any) => e.sections)
      .filter(Boolean);
    setStudentSections(names);
  };

  const loadAttendance = async () => {
    setLoading(true);
    const { from, to } = getRange(page);

    const { data, count } = await supabase
      .from("attendance")
      .select("id, status, scanned_at, sessions(subject, room, created_at)", {
        count: "exact",
      })
      .eq("student_id", id)
      .order("scanned_at", { ascending: false })
      .range(from, to);

    if (data) setRecords(data as any);
    setTotalCount(count ?? 0);
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
          <Text style={styles.hint}>
            Contact your admin to edit this record.
          </Text>
        </View>

        {studentSections.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sections</Text>
            <View style={styles.sectionsRow}>
              {studentSections.map((s) => (
                <View key={s.id} style={styles.sectionChip}>
                  <Text style={styles.sectionChipText}>{s.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Attendance Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#F2816B" }]}>
              {lateCount}
            </Text>
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
                <Text style={styles.recordSubject}>
                  {r.sessions?.subject ?? "Unknown"}
                </Text>
                <Text style={styles.recordMeta}>
                  {r.sessions?.room ?? ""} ·{" "}
                  {new Date(r.scanned_at).toLocaleString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  { color: r.status === "late" ? "#F2816B" : "#C8F04D" },
                ]}
              >
                {r.status === "late" ? "Late" : "Present"}
              </Text>
            </View>
          ))
        )}

        <View style={styles.pagerRow}>
          <TouchableOpacity
            style={[styles.pagerBtn, page === 0 && styles.pagerBtnDisabled]}
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <Text style={styles.pagerBtnText}>← Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pagerLabel}>
            {totalCount === 0
              ? "0"
              : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)}`}{" "}
            of {totalCount}
          </Text>
          <TouchableOpacity
            style={[
              styles.pagerBtn,
              (page + 1) * PAGE_SIZE >= totalCount && styles.pagerBtnDisabled,
            ]}
            onPress={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= totalCount}
          >
            <Text style={styles.pagerBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, gap: 12, paddingBottom: 48 },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 16,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  name: { color: "#fff", fontSize: 18, fontWeight: "700" },
  idText: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  hint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  sectionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  sectionChip: {
    backgroundColor: "rgba(200,240,77,0.1)",
    borderWidth: 1,
    borderColor: "rgba(200,240,77,0.2)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sectionChipText: { color: "#C8F04D", fontSize: 12, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  summaryNumber: { color: "#C8F04D", fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  recordSubject: { color: "#fff", fontSize: 14, fontWeight: "600" },
  recordMeta: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: "700" },
  empty: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 8 },
  pagerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  pagerBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pagerBtnDisabled: { opacity: 0.3 },
  pagerBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  pagerLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
});
