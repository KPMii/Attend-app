import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";

type Subject = { id: string; name: string };

export default function SubjectList() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSubjects = async () => {
    setLoading(true);

    const currentSchoolId = useAuthStore.getState().schoolId;

    const { data } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("school_id", currentSchoolId)
      .order("name");

    if (data) setSubjects(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const addSubject = async () => {
    if (!newName.trim()) return;

    const debugUser = await supabase.auth.getUser(); // TO SEE IF THERE IS ERROR
    console.log("DEBUG logged in as:", debugUser.data.user?.email); // TO SEE IF THERE IS ERROR

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const currentSchoolId = useAuthStore.getState().schoolId;
    console.log("DEBUG schoolId:", currentSchoolId); // TO SEE IF THERE IS ERROR

    const { error } = await supabase.from("subjects").insert({
      name: newName.trim(),
      faculty_id: user.id,
      school_id: currentSchoolId,
    });

    if (!error) {
      setNewName("");
      fetchSubjects();
    } else {
      console.error("[Subjects] Insert error:", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Subjects</Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New subject e.g. Gen Math"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addSubject}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchSubjects}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/faculty/subjects/${item.id}`)}
          >
            <Text style={styles.subjectName}>{item.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No subjects yet — add one above</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  addRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
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
  addBtn: {
    backgroundColor: "#C8F04D",
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  addBtnText: { color: "#0D0D0D", fontWeight: "800" },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  subjectName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 22 },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
});
