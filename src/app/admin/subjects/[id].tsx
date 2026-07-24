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
import { generateSessionPdf } from "../../../../lib/reportGenerator";
import { supabase } from "../../../../lib/supabase";

type SessionRow = { id: string; created_at: string; room: string };

export default function AdminSubjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [subjectName, setSubjectName] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadSubject();
    loadSessions();
  }, [id]);

  const loadSubject = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", id)
      .single();
    if (data) setSubjectName(data.name);
  };

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sessions")
      .select("id, created_at, room")
      .eq("subject_id", id)
      .order("created_at", { ascending: false });
    if (data) setSessions(data);
    setLoading(false);
  };

  const handleGeneratePdf = async (sessionId: string) => {
    if (generatingId) return;
    setGeneratingId(sessionId);
    try {
      await generateSessionPdf(sessionId);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: subjectName || "Subject" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{subjectName}</Text>

        <Text style={styles.sectionTitle}>Session History</Text>
        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : sessions.length === 0 ? (
          <Text style={styles.empty}>No sessions run yet for this subject</Text>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <View>
                <Text style={styles.sessionDate}>
                  {new Date(s.created_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <Text style={styles.sessionRoom}>{s.room}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleGeneratePdf(s.id)}
                disabled={generatingId === s.id}
              >
                <Text style={styles.pdfLink}>
                  {generatingId === s.id ? "Generating..." : "📄 PDF"}
                </Text>
              </TouchableOpacity>
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
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 4,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  sessionDate: { color: "#fff", fontSize: 14, fontWeight: "600" },
  sessionRoom: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  pdfLink: { color: "#C8F04D", fontSize: 12, fontWeight: "700" },
  empty: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 },
});
