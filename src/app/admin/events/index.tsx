import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

type EventRow = { id: string; event_name: string; room: string; created_at: string; expires_at: string };

export default function EventsList() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sessions")
      .select("id, event_name, room, created_at, expires_at")
      .eq("session_type", "event")
      .order("created_at", { ascending: false });
    if (data) setEvents(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <TouchableOpacity onPress={() => router.push("/faculty/qrgenerator?type=event")}>
          <Text style={styles.newLink}>+ New Event</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchEvents}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.eventName}>{item.event_name}</Text>
              <Text style={styles.eventMeta}>
                {item.room} · {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No events yet</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12,
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  newLink: { color: "#C8F04D", fontSize: 13, fontWeight: "700" },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  row: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, marginBottom: 8,
  },
  eventName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  eventMeta: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
});