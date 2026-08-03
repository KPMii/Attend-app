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

type EventRow = {
  id: string;
  event_name: string;
  room: string;
  created_at: string;
};

export default function EventHistory() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEvents = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { from, to } = getRange(page);

    // TODO: decide scope — only events THIS council member created,
    // or all events school-wide? Currently scoped to own (faculty_id).
    const { data, count } = await supabase
      .from("sessions")
      .select("id, event_name, room, created_at", { count: "exact" })
      .eq("session_type", "event")
      .eq("faculty_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data) setEvents(data as any);
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [page]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Event History</Text>
        <Text style={styles.subtitle}>{totalCount} total events</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchEvents}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.rowLeft}
              onPress={() =>
                router.push(
                  `/faculty/student-council/event-details?id=${item.id}`,
                )
              }
            >
              <Text style={styles.eventName}>{item.event_name}</Text>
              <Text style={styles.meta}>
                {item.room} · {new Date(item.created_at).toLocaleString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={() =>
                router.push({
                  pathname: "/faculty/qrgenerator",
                  params: { resume: item.id },
                })
              }
            >
              <Text style={styles.resumeBtnText}>↻ Resume</Text>
            </TouchableOpacity>
            <Text style={styles.chevron}>›</Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No events yet</Text> : null
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
  eventName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  meta: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 22 },
  resumeBtn: {
    backgroundColor: "rgba(200,240,77,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  resumeBtnText: { color: "#C8F04D", fontSize: 12, fontWeight: "700" },
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
