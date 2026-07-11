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

type Section = { id: string; name: string; room: string | null };

export default function SectionList() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [newName, setNewName] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSections = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sections")
      .select("id, name, room")
      .order("name");
    if (data) setSections(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const addSection = async () => {
    if (!newName.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch school_id fresh, live, instead of trusting the cached store
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (!profile?.school_id) {
      console.error("[Subjects] No school_id found for this user");
      return;
    }

    const { error } = await supabase.from("subjects").insert({
      name: newName.trim(),
      faculty_id: user.id,
      school_id: profile.school_id,
    });

    if (!error) {
      setNewName("");
      fetchSections();
    } else {
      console.error("[Subjects] Insert error:", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Sections</Text>
      </View>

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
        <TouchableOpacity
          style={[
            styles.addBtn,
            (!newName.trim() || !newRoom.trim()) && styles.addBtnDisabled,
          ]}
          onPress={addSection}
          disabled={!newName.trim() || !newRoom.trim()}
        >
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
            onPress={() => router.push(`/faculty/sections/${item.id}`)}
          >
            <View>
              <Text style={styles.sectionName}>{item.name}</Text>
              <Text style={styles.roomText}>Room: {item.room ?? "—"}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No sections yet</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  form: { paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  input: {
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
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnDisabled: { opacity: 0.35 },
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
  sectionName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  roomText: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 22 },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
});
