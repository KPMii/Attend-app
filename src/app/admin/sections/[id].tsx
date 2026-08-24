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
import { supabase } from "../../../lib/supabase";

type Student = { id: string; full_name: string; school_id_no: string | null };

export default function AdminSectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [sectionName, setSectionName] = useState("");
  const [room, setRoom] = useState("");
  const [roster, setRoster] = useState<Student[]>([]);
  const [searchId, setSearchId] = useState("");
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [foundStudentSections, setFoundStudentSections] = useState<string[]>(
    [],
  );
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
    const { data } = await supabase.rpc("get_section_roster", {
      p_section_id: id,
    });
    if (data) {
      setRoster(
        data.map((r: any) => ({
          id: r.student_id,
          full_name: r.full_name,
          school_id_no: r.school_id_no,
        })),
      );
    }
    setLoading(false);
  };

  const searchStudent = async () => {
    setSearchError(null);
    setFoundStudent(null);
    setFoundStudentSections([]);
    if (!searchId.trim()) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, school_id_no")
      .eq("school_id_no", searchId.trim().toUpperCase())
      .in("role", ["student", "student_council_officer"])
      .maybeSingle();

    if (error || !data) {
      setSearchError("No student found with that School ID");
      return;
    }
    if (roster.some((r) => r.id === data.id)) {
      setSearchError("This student is already in the roster");
      return;
    }

    const { data: enrollments } = await supabase
      .from("section_enrollments")
      .select("sections(name)")
      .eq("student_id", data.id);

    const otherSections: string[] = (enrollments ?? [])
      .map((e: any) => e.sections?.name)
      .filter(Boolean);

    setFoundStudent(data);
    setFoundStudentSections(otherSections);
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{sectionName}</Text>
        <Text style={styles.roomText}>Room: {room || "—"}</Text>

        <Text style={styles.sectionTitle}>Add Student</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Enter School ID"
            placeholderTextColor="rgba(107, 85, 85, 0.25)"
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
              {foundStudentSections.length > 0 && (
                <Text style={styles.foundOtherSections}>
                  Also in: {foundStudentSections.join(", ")}
                </Text>
              )}
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
  container: { flex: 1, backgroundColor: "#FBFBFF" },
  scroll: { padding: 24, gap: 8, paddingBottom: 48 },
  title: {
    color: "#17181C",
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_400Regular",
    marginTop: 36,
  },
  roomText: {
    color: "#85899B",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    color: "#85899B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 4,
    fontFamily: "Inter_400Regular",
  },
  addRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECE7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#17181C",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  searchBtn: {
    backgroundColor: "#F0F3FF",
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#305CDE",
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    color: "#C85D4D",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  foundCard: {
    backgroundColor: "#F0F3FF",
    borderWidth: 1,
    borderColor: "#D8E0FB",
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  foundName: {
    color: "#17181C",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_400Regular",
  },
  foundId: {
    color: "#85899B",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  foundOtherSections: {
    color: "#9A9DA6",
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
    fontFamily: "Inter_400Regular",
  },
  addBtn: {
    backgroundColor: "#305CDE",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  rosterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#ECECE7",
  },
  rosterName: {
    color: "#17181C",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_400Regular",
  },
  rosterId: {
    color: "#85899B",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  removeText: {
    color: "#C85D4D",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_400Regular",
  },
  empty: {
    color: "#9A9DA6",
    fontSize: 13,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
});
