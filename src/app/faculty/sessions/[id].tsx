import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
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

  const title =
    sessionInfo?.sessionType === "event"
      ? sessionInfo.eventName
      : sessionInfo?.subject;

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Session Attendance" }} />

      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {sessionInfo && (
          <View style={styles.headerCard}>
            <Text style={styles.sessionTitle}>{title}</Text>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={15} color="#85899B" />

              <Text style={styles.meta}>{sessionInfo.room || "No room"}</Text>

              <Text style={styles.separator}>-</Text>

              <Ionicons name="time-outline" size={15} color="#85899B" />

              <Text style={styles.meta}>
                {formatTime(sessionInfo.createdAt)}
              </Text>
            </View>
          </View>
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

          {sessionInfo?.sectionId && (
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryNumber, styles.absent]}>
                {absentCount}
              </Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
          )}
        </View>

        {sessionInfo?.sessionType === "event" && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.resumeButton}
            onPress={() =>
              router.push({
                pathname: "/faculty/qrgenerator",
                params: { resume: id },
              })
            }
          >
            <Text style={styles.resumeText}>Start Again</Text>

            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {sessionInfo?.sectionId ? "Class Roster" : "Attendees"}
          </Text>

          <Text style={styles.listCount}>{rows.length}</Text>
        </View>

        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No attendance recorded yet</Text>
        ) : (
          <View style={styles.list}>
            {rows.map((r, index) => {
              const statusColor =
                r.status === "present"
                  ? "#6D9F24"
                  : r.status === "late"
                    ? "#B07A18"
                    : "#C85D4D";

              return (
                <View
                  key={r.id}
                  style={[
                    styles.row,
                    index === rows.length - 1 && styles.lastRow,
                  ]}
                >
                  <View style={styles.studentInfo}>
                    <Text style={styles.name}>{r.full_name}</Text>

                    <Text style={styles.idText}>
                      {r.school_id_no || "No school ID"}
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
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9FF",
  },

  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  headerCard: {
    backgroundColor: "#FFFFFF",
    marginTop: 30,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ECECE7",
  },

  sessionTitle: {
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

  separator: {
    color: "#B7B9C0",
    marginHorizontal: 2,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 10,
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

  present: {
    color: "#6D9F24",
  },

  late: {
    color: "#B07A18",
  },

  absent: {
    color: "#C85D4D",
  },

  resumeButton: {
    height: 46,
    backgroundColor: "#305CDE",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 22,
  },

  resumeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
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

  studentInfo: {
    flex: 1,
  },

  name: {
    color: "#25262B",
    fontSize: 13,
    fontWeight: "600",
  },

  idText: {
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
});
