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

type Room = { id: string; name: string };

export default function RoomList() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    setLoading(true);
    const { data } = await supabase.from("rooms").select("id, name").order("name");
    if (data) setRooms(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const addRoom = async () => {
    if (!newName.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("rooms")
      .insert({ name: newName.trim(), faculty_id: user.id });

    if (!error) {
      setNewName("");
      fetchRooms();
    }
  };

  const removeRoom = async (id: string) => {
    await supabase.from("rooms").delete().eq("id", id);
    fetchRooms();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Rooms</Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New room e.g. Room 204"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addRoom}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchRooms}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.roomName}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeRoom(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No rooms yet — add one above</Text> : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  addRow: { flexDirection: "row", gap: 8, paddingHorizontal: 24, marginBottom: 16 },
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
  roomName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  removeText: { color: "#F2816B", fontSize: 13, fontWeight: "600" },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
});