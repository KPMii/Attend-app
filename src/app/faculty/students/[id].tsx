import { Ionicons } from "@expo/vector-icons";
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

const BLUE = "#305CDE";
const FADED_BLUE = "#F0F3FF";
const GREEN = "#6D9F24";
const AMBER = "#B07A18";

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
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.headerCard}>
          <Text style={styles.studentName}>{fullName || "—"}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="card-outline" size={15} color="#85899B" />
            <Text style={styles.meta}>School ID: {schoolIdNo || "—"}</Text>
          </View>
          <Text style={styles.hint}>
            Contact your admin to edit this record.
          </Text>
        </View>

        {studentSections.length > 0 && (
          <>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Sections</Text>
              <Text style={styles.listCount}>{studentSections.length}</Text>
            </View>
            <View style={styles.sectionsRow}>
              {studentSections.map((s) => (
                <View key={s.id} style={styles.sectionChip}>
                  <Text style={styles.sectionChipText}>{s.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, styles.present]}>
              {presentCount}
            </Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, styles.late]}>{lateCount}</Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Recent Attendance</Text>
          <Text style={styles.listCount}>{totalCount}</Text>
        </View>

        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : records.length === 0 ? (
          <Text style={styles.empty}>No attendance records yet</Text>
        ) : (
          <View style={styles.list}>
            {records.map((r, index) => {
              const statusColor = r.status === "late" ? AMBER : GREEN;
              return (
                <View
                  key={r.id}
                  style={[
                    styles.row,
                    index === records.length - 1 && styles.lastRow,
                  ]}
                >
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordSubject}>
                      {r.sessions?.subject ?? "Unknown"}
                    </Text>
                    <Text style={styles.recordMeta}>
                      {r.sessions?.room ?? ""} ·{" "}
                      {new Date(r.scanned_at).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.status}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {r.status === "late" ? "Late" : "Present"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
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
  container: { flex: 1, backgroundColor: "#F9F9FF" },
  scroll: { padding: 20, paddingBottom: 40 },

  headerCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 30,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECECE7",
  },
  studentName: {
    color: "#17181C",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 9,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  meta: {
    color: "#85899B",
    fontSize: 12,
  },
  hint: {
    color: "#9A9DA6",
    fontSize: 11,
    marginTop: 10,
    fontStyle: "italic",
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
    marginTop: 12,
  },
  listTitle: {
    color: "#17181C",
    fontSize: 15,
    fontWeight: "700",
  },
  listCount: {
    color: "#85899B",
    fontSize: 12,
  },

  sectionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  sectionChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECE7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sectionChipText: { color: "#25262B", fontSize: 12, fontWeight: "600" },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ECECE7",
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  summaryLabel: {
    color: "#85899B",
    fontSize: 11,
  },
  present: { color: GREEN },
  late: { color: AMBER },

  list: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#ECECE7",
  },
  row: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0EC",
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  recordInfo: {
    flex: 1,
  },
  recordSubject: {
    color: "#25262B",
    fontSize: 13,
    fontWeight: "600",
  },
  recordMeta: {
    color: "#9A9DA6",
    fontSize: 11,
    marginTop: 3,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  empty: {
    color: "#9A9DA6",
    fontSize: 12,
    textAlign: "center",
    marginTop: 40,
  },

  pagerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  pagerBtn: {
    backgroundColor: FADED_BLUE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pagerBtnDisabled: { opacity: 0.35 },
  pagerBtnText: { color: BLUE, fontSize: 13, fontWeight: "700" },
  pagerLabel: { color: "#85899B", fontSize: 12 },
});
