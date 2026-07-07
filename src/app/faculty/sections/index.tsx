import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    FlatList,
    SafeAreaView, StatusBar, StyleSheet, Text, TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

type Room = { id: string; name: string };
type Section = { id: string; name: string; room_id: string | null; rooms: { name: string } | null };

export default function SectionList() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: secData }, { data: roomData }] = await Promise.all([
      supabase.from("sections").select("id, name, room_id, rooms(name)").order("name"),
      supabase.from("rooms").select("id, name").order("name"),
    ]);
    if (secData) setSections(secData as any);
    if (roomData) setRooms(roomData);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const addSection = async () => {
    if (!newName.trim() || !selectedRoomId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("sections").insert({
      name: newName.trim(),
      room_id: selectedRoomId,
      faculty_id: user.id,
    });

    if (!error) {
      setNewName("");
      setSelectedRoomId(null);
      fetchAll();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}><Text style={styles.title}>Sections</Text></View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Section name e.g. Grade 10-A"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={newName}
          onChangeText={setNewName}
        />
        <Text style={styles.label}>Assign Room</Text>
        <View style={styles.chipRow}>
          {rooms.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.chip, selectedRoomId === r.id && styles.chipActive]}
              onPress={() => setSelectedRoomId(r.id)}
            >
              <Text style={[styles.chipText, selectedRoomId === r.id && styles.chipTextActive]}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, (!newName.trim() || !selectedRoomId) && styles.addBtnDisabled]}
          onPress={addSection}
          disabled={!newName.trim() || !selectedRoomId}
        >
          <Text style={styles.addBtnText}>Create Section</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchAll}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/faculty/sections/${item.id}`)}
          >
            <View>
              <Text style={styles.sectionName}>{item.name}</Text>
              <Text style={styles.roomText}>Room: {item.rooms?.name ?? "—"}</Text>
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
  form: { paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, color: "#fff", fontSize: 14,
  },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600", marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipActive: { backgroundColor: "rgba(200,240,77,0.14)", borderColor: "#C8F04D" },
  chipText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#C8F04D" },
  addBtn: { backgroundColor: "#C8F04D", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  addBtnDisabled: { opacity: 0.35 },
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