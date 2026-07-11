import { Stack, useLocalSearchParams } from "expo-router";
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

export default function SectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [sectionName, setSectionName] = useState("");
  const [room, setRoom] = useState("");
  const [roster, setRoster] = useState<Student[]>([]);
  const [searchId, setSearchId] = useState("");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadSection();
    loadRoster();
  }, [id]);

  const loadSection = async () => {
    const { data } = await supabase
      .from("sections")
      .select("name, room")
      .eq("id", id)
      .single();
    if (data) {
      setSectionName(data.name);
      setRoom(data.room ?? "");
    }
  };

  const loadRoster = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("section_enrollments")
      .select("student_id, profiles(id, full_name, school_id_no)")
      .eq("section_id", id);

    if (data) {
      setRoster(data.map((r: any) => r.profiles).filter(Boolean));
    }
    setLoading(false);
  };

  const searchStudent = async () => {
    setSearchError(null);
    setFoundStudent(null);
    if (!searchId.trim()) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, school_id_no")
      .eq("school_id_no", searchId.trim().toUpperCase())
      .eq("role", "student")
      .maybeSingle();

    if (error || !data) {
      setSearchError("No student found with that School ID");
      return;
    }

    const alreadyEnrolled = roster.some((r) => r.id === data.id);
    if (alreadyEnrolled) {
      setSearchError("This student is already in the roster");
      return;
    }

    setFoundStudent(data);
  };

  const addToRoster = async () => {
    if (!foundStudent) return;
    const { error } = await supabase
      .from("section_enrollments")
      .insert({ section_id: id, student_id: foundStudent.id });

    if (!error) {
      setSearchId("");
      setFoundStudent(null);
      loadRoster();
    }
  };

  const removeFromRoster = async (studentId: string) => {
    await supabase
      .from("section_enrollments")
      .delete()
      .eq("section_id", id)
      .eq("student_id", studentId);
    loadRoster();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: sectionName || "Section" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{sectionName}</Text>
        <Text style={styles.roomText}>Room: {room || "—"}</Text>

        <Text style={styles.sectionTitle}>Add Student</Text>
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

        {searchError && <Text style={styles.errorText}>{searchError}</Text>}

        {foundStudent && (
          <View style={styles.foundCard}>
            <View>
              <Text style={styles.foundName}>{foundStudent.full_name}</Text>
              <Text style={styles.foundId}>{foundStudent.school_id_no}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={addToRoster}>
              <Text style={styles.addBtnText}>Add to Roster</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Roster ({roster.length})</Text>
        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : roster.length === 0 ? (
          <Text style={styles.empty}>No students enrolled yet</Text>
        ) : (
          roster.map((s) => (
            <View key={s.id} style={styles.rosterRow}>
              <View>
                <Text style={styles.rosterName}>{s.full_name}</Text>
                <Text style={styles.rosterId}>{s.school_id_no}</Text>
              </View>
              <TouchableOpacity onPress={() => removeFromRoster(s.id)}>
                <Text style={styles.removeText}>Remove</Text>
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
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  roomText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
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
  errorText: { color: "#F2816B", fontSize: 12, marginTop: 4 },
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
  foundId: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
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
  empty: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 },
});
