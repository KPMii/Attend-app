import { useEffect, useState } from "react";
import {
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

type LogRow = {
  id: string;
  action: string;
  description: string | null;
  created_at: string;
};

const actionColor: Record<string, string> = {
  login: "#C8F04D",
  logout: "#F2C14E",
  session_created: "#C8F04D",
  profile_updated: "#4EA1F2",
};

export default function AuditLog() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audit_logs")
      .select("id, action, description, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Audit Log</Text>
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
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No activity yet</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  rowContent: { flex: 1, gap: 2 },
  action: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  description: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  time: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
});
