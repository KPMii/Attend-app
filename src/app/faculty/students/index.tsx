import "@/app/faculty/students/[id]";
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

type Student = {
  id: string;
  full_name: string;
  school_id_no: string | null;
};

export default function StudentManager() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, school_id_no")
      .eq("role", "student")
      .order("full_name");

    if (!error && data) setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.school_id_no?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <Text style={styles.subtitle}>{students.length} total</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by name or School ID..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchStudents}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/faculty/students/${item.id}`)}
          >
            <View>
              <Text style={styles.name}>{item.full_name || "(No name)"}</Text>
              <Text style={styles.idText}>ID: {item.school_id_no || "—"}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No students found</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  search: {
    marginHorizontal: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
  },
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
  name: { color: "#fff", fontSize: 15, fontWeight: "600" },
  idText: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 22 },
  empty: {
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 40,
  },
});
