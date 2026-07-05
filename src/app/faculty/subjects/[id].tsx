import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

type Student = { id: string; full_name: string; school_id_no: string | null };
type SessionRow = { id: string; created_at: string; room: string };

export default function SubjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [subjectName, setSubjectName] = useState("");
  const [roster, setRoster] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [searchId, setSearchId] = useState("");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (!id) return;
    loadSubject();
    loadRoster();
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

  const loadRoster = async () => {
    const { data } = await supabase
      .from("subject_enrollments")
      .select("student_id, profiles(id, full_name, school_id_no)")
      .eq("subject_id", id);

    if (data) setRoster(data.map((r: any) => r.profiles).filter(Boolean));
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id, created_at, room")
      .eq("subject_id", id)
      .order("created_at", { ascending: false });
    if (data) setSessions(data);
  };

  const searchStudent = async () => {
    if (!searchId.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, school_id_no")
      .eq("school_id_no", searchId.trim().toUpperCase())
      .eq("role", "student")
      .maybeSingle();
    setFoundStudent(data ?? null);
  };

  const addToRoster = async () => {
    if (!foundStudent) return;
    const { error } = await supabase
      .from("subject_enrollments")
      .insert({ subject_id: id, student_id: foundStudent.id });
    if (!error) {
      setSearchId("");
      setFoundStudent(null);
      loadRoster();
    }
  };

  const removeFromRoster = async (studentId: string) => {
    await supabase
      .from("subject_enrollments")
      .delete()
      .eq("subject_id", id)
      .eq("student_id", studentId);
    loadRoster();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: subjectName || "Subject" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{subjectName}</Text>

        <Text style={styles.sectionTitle}>Add Student to Roster</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter School ID"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={searchId}
            onChangeText={setSearchId}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={searchStudent}>
            <Text style={styles.searchBtnText}>Find</Text>
          </TouchableOpacity>
        </View>

        {foundStudent && (
          <View style={styles.foundCard}>
            <Text style={styles.foundName}>{foundStudent.full_name}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={addToRoster}>
              <Text style={styles.addBtnText}>Add to Roster</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Roster ({roster.length})</Text>
        {roster.map((s) => (
          <View key={s.id} style={styles.rosterRow}>
            <View>
              <Text style={styles.rosterName}>{s.full_name}</Text>
              <Text style={styles.rosterId}>{s.school_id_no}</Text>
            </View>
            <TouchableOpacity onPress={() => removeFromRoster(s.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Session History</Text>
        {sessions.length === 0 ? (
          <Text style={styles.empty}>No sessions run yet for this subject</Text>
        ) : (
          sessions.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.sessionRow}
              onPress={() =>
                router.push(`/faculty/subjects/${id}/session/${s.id}`)
              }
            >
              <Text style={styles.sessionDate}>
                {new Date(s.created_at).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              <Text style={styles.sessionRoom}>{s.room}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
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
  addRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  foundCard: {
    backgroundColor: "rgba(200,240,77,0.08)",
    borderWidth: 1,
    borderColor: "rgba(200,240,77,0.25)",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  foundName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  addBtn: {
    backgroundColor: "#C8F04D",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: "#0D0D0D", fontWeight: "800", fontSize: 12 },
  rosterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  rosterName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  rosterId: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  removeText: { color: "#F2816B", fontSize: 13, fontWeight: "600" },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  sessionDate: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },
  sessionRoom: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 20 },
  empty: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 },
});
