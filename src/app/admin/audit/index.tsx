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

type LogRow = {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
};

const actionColor: Record<string, string> = {
  login: "#6D9F24",
  logout: "#B07A18",
  session_created: "#6D9F24",
  profile_updated: "#4EA1F2",
};

export default function AuditLog() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    const { from, to } = getRange(page);

    const { data, count } = await supabase
      .from("audit_logs")
      .select("id, action, description, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data) setLogs(data);
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Audit Log</Text>
        <Text style={styles.subtitle}>{totalCount} total entries</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchLogs}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View
              style={[
                styles.dot,
                { backgroundColor: actionColor[item.action] ?? "#888" },
              ]}
            />
            <View style={styles.rowContent}>
              <Text style={styles.action}>
                {item.action.replace(/_/g, " ")}
              </Text>
              {item.description && (
                <Text style={styles.description}>{item.description}</Text>
              )}
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                ·{" "}
                {new Date(item.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No activity yet</Text> : null
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
  container: { flex: 1, backgroundColor: "#FBFBFF" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    marginTop: 36,
  },
  title: {
    color: "#17181C",
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_400Regular",
  },
  subtitle: {
    color: "#85899B",
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  list: { paddingHorizontal: 24, paddingBottom: 8 },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ECECE7",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  rowContent: { flex: 1, gap: 2 },
  action: {
    color: "#17181C",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
    fontFamily: "Inter_400Regular",
  },
  description: {
    color: "#626575",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  time: {
    color: "#9A9DA6",
    fontSize: 11,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    color: "#9A9DA6",
    textAlign: "center",
    marginTop: 40,
    fontFamily: "Inter_400Regular",
  },
  pagerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  pagerBtn: {
    backgroundColor: "#F0F3FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pagerBtnDisabled: { opacity: 0.35 },
  pagerBtnText: {
    color: "#305CDE",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  pagerLabel: {
    color: "#85899B",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
