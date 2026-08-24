import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PAGE_SIZE, getRange } from "../../../lib/pagination";
import { supabase } from "../../../lib/supabase";

type SessionRow = {
  id: string;
  subject: string;
  room: string;
  created_at: string;
  session_type: string;
  event_name: string | null;
};

export default function FacultySessionHistory() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSessions = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { from, to } = getRange(page);

    const { data, count } = await supabase
      .from("sessions")
      .select("id, subject, room, created_at, session_type, event_name", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data) setSessions(data);
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [page]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Session History</Text>
        <Text style={styles.subtitle}>{totalCount} total sessions</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchSessions}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/admin/sessions/${item.id}`)}
          >
            <View style={styles.rowLeft}>
              <View style={styles.rowHeader}>
                <Text style={styles.subject}>
                  {item.session_type === "event"
                    ? item.event_name
                    : item.subject}
                </Text>
                {item.session_type === "event" && (
                  <View style={styles.eventBadge}>
                    <Text style={styles.eventBadgeText}>EVENT</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>
                {item.room} · {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No sessions yet</Text> : null
        }
      />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  list: { paddingHorizontal: 24, paddingBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  rowLeft: { flex: 1 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  subject: { color: "#fff", fontSize: 15, fontWeight: "600" },
  eventBadge: {
    backgroundColor: "rgba(200,240,77,0.15)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eventBadgeText: { color: "#C8F04D", fontSize: 9, fontWeight: "800" },
  meta: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 22 },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
  pagerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
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
