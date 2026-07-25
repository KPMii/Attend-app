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
import { PAGE_SIZE, getRange } from "../../../lib/pagination";
import { supabase } from "../../../lib/supabase";

type Faculty = { id: string; full_name: string };

export default function FacultyList() {
  const router = useRouter();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFaculty = async () => {
    setLoading(true);
    const { from, to } = getRange(page);

    const { data, count } = await supabase
      .from("profiles")
      .select("id, full_name", { count: "exact" })
      .eq("role", "faculty")
      .order("full_name")
      .range(from, to);

    if (data) setFaculty(data);
    setTotalCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchFaculty();
  }, [page]);

  const filtered = faculty.filter((f) =>
    f.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Faculty</Text>
          <Text style={styles.subtitle}>{totalCount} total</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/admin/faculty/add")}>
          <Text style={styles.addLink}>+ Add Faculty</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search this page by name..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchFaculty}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/admin/faculty/${item.id}`)}
          >
            <Text style={styles.name}>{item.full_name || "(No name)"}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No faculty found</Text> : null
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  addLink: { color: "#C8F04D", fontSize: 13, fontWeight: "700", marginTop: 6 },
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
  name: { color: "#fff", fontSize: 15, fontWeight: "600" },
  chevron: { color: "rgba(255,255,255,0.3)", fontSize: 22 },
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
