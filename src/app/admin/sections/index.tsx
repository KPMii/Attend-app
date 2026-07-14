import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList, SafeAreaView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

type Section = { id: string; name: string; room: string | null };

export default function AdminSections() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [newName, setNewName] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getMySchoolId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles").select("school_id").eq("id", user.id).single();
    return profile?.school_id ?? null;
  };

  const fetchSections = async () => {
    setLoading(true);
    const schoolId = await getMySchoolId();
    if (!schoolId) {
      setError("No school assigned to this account.");
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("sections").select("id, name, room").eq("school_id", schoolId).order("name");
    if (data) setSections(data);
    setLoading(false);
  };

  useEffect(() => { fetchSections(); }, []);

  const addSection = async () => {
    if (!newName.trim() || !newRoom.trim()) return;
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const schoolId = await getMySchoolId();
    if (!schoolId) {
      setError("No school assigned to this account.");
      return;
    }

    const { error: insertError } = await supabase.from("sections").insert({
      name: newName.trim(),
      room: newRoom.trim(),
      faculty_id: user.id,
      school_id: schoolId,
    });

    if (!insertError) {
      setNewName("");
      setNewRoom("");
      fetchSections();
    } else {
      setError(
        insertError.message.includes("duplicate")
          ? "A section with this name already exists."
          : insertError.message,
      );
    }
  };

  const removeSection = async (id: string) => {
    await supabase.from("sections").delete().eq("id", id);
    fetchSections();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Sections</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Section name e.g. Grade 10-A"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.input}
          placeholder="Room e.g. Room 204"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={newRoom}
          onChangeText={setNewRoom}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addSection}>
          <Text style={styles.addBtnText}>Create Section</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchSections}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/admin/sections/${item.id}`)}
          >
            <View>
              <Text style={styles.sectionName}>{item.name}</Text>
              <Text style={styles.roomText}>Room: {item.room ?? "—"}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No sections yet</Text> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  errorText: { color: "#F2816B", fontSize: 13, paddingHorizontal: 24, marginBottom: 8 },
  form: { paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: "#fff", fontSize: 14,
  },
  addBtn: { backgroundColor: "#C8F04D", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  addBtnText: { color: "#0D0D0D", fontWeight: "800" },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, marginBottom: 8,
  },
  sectionName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  roomText: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 22 },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
});