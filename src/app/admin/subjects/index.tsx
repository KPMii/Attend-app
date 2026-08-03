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
import { PAGE_SIZE, getRange } from "../../../lib/pagination";
import { supabase } from "../../../lib/supabase";

type Subject = { id: string; name: string };

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const getMySchoolId = async (): Promise<string | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    return profile?.school_id ?? null;
  };

  const fetchSubjects = async () => {
    setLoading(true);
    const schoolId = await getMySchoolId();
    if (!schoolId) {
      setError("No school assigned to this account.");
      setLoading(false);
      return;
    }
    const { from, to } = getRange(page);

    const { data, count } = await supabase
      .from("subjects")
      .select("id, name", { count: "exact" })
      .eq("school_id", schoolId)
      .order("name")
      .range(from, to);

    if (data) setSubjects(data);
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, [page]);

  const addSubject = async () => {
    if (!newName.trim()) return;
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const schoolId = await getMySchoolId();
    if (!schoolId) {
      setError("No school assigned to this account.");
      return;
    }

    const { error: insertError } = await supabase.from("subjects").insert({
      name: newName.trim(),
      faculty_id: user.id,
      school_id: schoolId,
    });

    if (!insertError) {
      setNewName("");
      setPage(0);
      fetchSubjects();
    } else {
      setError(
        insertError.message.includes("duplicate")
          ? "A subject with this name already exists."
          : insertError.message,
      );
    }
  };

  const removeSubject = async (id: string) => {
    await supabase.from("sessions").update({ subject_id: null }).eq("subject_id", id);
    const { error: delError } = await supabase.from("subjects").delete().eq("id", id);
    if (delError) { setError(delError.message); return; }
    fetchSubjects();
    fetchSubjects();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Subjects</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

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
          <View style={styles.row}>
            <Text style={styles.subjectName}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeSubject(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No subjects yet</Text> : null
        }
      />

      <View style={styles.pagerRow}>
        <TouchableOpacity
          style={[styles.pagerBtn, page === 0 && styles.pagerBtnDisabled]}
          onPress={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <Text style={styles.pagerBtnText}>← Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pagerLabel}>
          {totalCount === 0
            ? "0"
            : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)}`}{" "}
          of {totalCount}
        </Text>
        <TouchableOpacity
          style={[
            styles.pagerBtn,
            (page + 1) * PAGE_SIZE >= totalCount && styles.pagerBtnDisabled,
          ]}
          onPress={() => setPage((p) => p + 1)}
          disabled={(page + 1) * PAGE_SIZE >= totalCount}
        >
          <Text style={styles.pagerBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  errorText: {
    color: "#F2816B",
    fontSize: 13,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
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
  list: { paddingHorizontal: 24, paddingBottom: 8 },
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
  removeText: { color: "#F2816B", fontSize: 13, fontWeight: "600" },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
  pagerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  pagerBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pagerBtnDisabled: { opacity: 0.3 },
  pagerBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  pagerLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
});
