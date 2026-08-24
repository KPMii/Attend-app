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
import { supabase } from "../../../lib/supabase";

type EventRow = {
  id: string;
  event_name: string;
  room: string;
  created_at: string;
  expires_at: string;
};

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

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <TouchableOpacity
          onPress={() => router.push("/faculty/qrgenerator?type=event")}
        >
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
          !loading ? <Text style={styles.empty}>No events yet</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBFBFF" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  newLink: {
    color: "#305CDE",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ECECE7",
  },
  eventName: {
    color: "#17181C",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_400Regular",
  },
  eventMeta: {
    color: "#85899B",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    color: "#9A9DA6",
    textAlign: "center",
    marginTop: 40,
    fontFamily: "Inter_400Regular",
  },
});
