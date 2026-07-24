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
import { supabase } from "../../../../lib/supabase";

type Row = {
  id: string;
  full_name: string;
  school_id_no: string | null;
  status: "present" | "late" | "absent";
};

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sessionInfo, setSessionInfo] = useState<{
    subject: string;
    room: string;
    createdAt: string;
    sessionType: string;
    eventName: string | null;
    sectionId: string | null;
  } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);

    const { data: session } = await supabase
      .from("sessions")
      .select("subject, room, created_at, session_type, event_name, section_id")
      .eq("id", id)
      .single();

    if (session) {
      setSessionInfo({
        subject: session.subject,
        room: session.room,
        createdAt: session.created_at,
        sessionType: session.session_type,
        eventName: session.event_name,
        sectionId: session.section_id,
      });
    }

    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("session_id", id);

    const attendanceMap = new Map(
      (attendance ?? []).map((a) => [a.student_id, a.status]),
    );

    if (session?.section_id) {
      // Class session: show full roster with absent computed
      const { data: roster } = await supabase.rpc("get_section_roster", {
        p_section_id: session.section_id,
      });

      const combined: Row[] = (roster ?? []).map((r: any) => ({
        id: r.student_id,
        full_name: r.full_name,
        school_id_no: r.school_id_no,
        status: (attendanceMap.get(r.student_id) as any) ?? "absent",
      }));
      combined.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setRows(combined);
    } else {
      // Event: no roster, just show who actually scanned
      const studentIds = [...attendanceMap.keys()];
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, school_id_no")
          .in("id", studentIds);

        const combined: Row[] = (profiles ?? []).map((p) => ({
          id: p.id,
          full_name: p.full_name,
          school_id_no: p.school_id_no,
          status: attendanceMap.get(p.id) as any,
        }));
        combined.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setRows(combined);
      }
    }

    setLoading(false);
  };

  const presentCount = rows.filter((r) => r.status === "present").length;
  const lateCount = rows.filter((r) => r.status === "late").length;
  const absentCount = rows.filter((r) => r.status === "absent").length;

  const statusColor = (s: string) =>
    s === "present" ? "#C8F04D" : s === "late" ? "#F2C14E" : "#F2816B";

  const title =
    sessionInfo?.sessionType === "event"
      ? sessionInfo.eventName
      : sessionInfo?.subject;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Session Attendance" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {sessionInfo && (
          <View style={styles.headerCard}>
            <Text style={styles.sessionTitle}>{title}</Text>
            <Text style={styles.sessionMeta}>
              {sessionInfo.room} ·{" "}
              {new Date(sessionInfo.createdAt).toLocaleString()}
            </Text>
          </View>
        )}

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
          {sessionInfo?.sectionId && (
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, { color: "#F2816B" }]}>
                {absentCount}
              </Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
          )}
        </View>

        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No attendance recorded yet</Text>
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
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sessionTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  sessionMeta: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
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
