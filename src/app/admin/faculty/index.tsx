import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getRange } from "../../../lib/pagination";
import { supabase } from "../../../lib/supabase";

type Faculty = { id: string; full_name: string };

const BLUE = "#305CDE";
const FADED_BLUE = "#F0F3FF";

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
            />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Faculty</Text>

          <View style={styles.countBadge}>
            <Image />

            <Text style={styles.countText}>
              {faculty.length.toLocaleString()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/admin/faculty/add")}
          activeOpacity={0.8}
        >
          <Image />

          <Text style={styles.addButtonText}>Add faculty</Text>
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Image />

          <TextInput
            style={styles.search}
            placeholder="Search this page by name..."
            placeholderTextColor="#B5B8C7"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchFaculty}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.studentCard}
              onPress={() => router.push(`/admin/faculty/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.studentInfo}>
                <Text style={styles.name}>{item.full_name || "(No name)"}</Text>

                <Text style={styles.idText}>ID: {item.full_name || "—"}</Text>
              </View>

              <Image />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.empty}>No students found</Text>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFF",
  },

  header: {
    marginTop: 30,
    height: 74,
    paddingHorizontal: 30,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  logoPlaceholder: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  logo: {
    width: 48,
    height: 48,
  },

  content: {
    flex: 1,
    paddingHorizontal: 30,
  },

  titleRow: {
    marginTop: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111525",
    fontFamily: "Inter_400Regular",
  },

  countBadge: {
    height: 43,
    paddingHorizontal: 17,
    borderRadius: 23,
    backgroundColor: "#E8EBFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  countText: {
    fontSize: 16,
    fontWeight: "600",
    color: BLUE,
    fontFamily: "Inter_400Regular",
  },

  addButton: {
    height: 73,
    marginTop: 32,
    borderRadius: 17,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: BLUE,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },

  addButtonText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
  },

  searchContainer: {
    height: 73,
    marginTop: 24,
    paddingHorizontal: 20,
    borderRadius: 17,
    backgroundColor: "#E8EBFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  search: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 0,
    color: "#171C2E",
    fontSize: 17,
    fontFamily: "Inter_400Regular",
  },

  list: {
    paddingTop: 24,
    paddingBottom: 35,
  },

  studentCard: {
    minHeight: 116,
    marginBottom: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F1F6",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },

  studentInfo: {
    flex: 1,
  },

  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111525",
    fontFamily: "Inter_400Regular",
  },

  idText: {
    marginTop: 8,
    fontSize: 16,
    color: "#737689",
    fontFamily: "Inter_400Regular",
  },

  empty: {
    marginTop: 40,
    textAlign: "center",
    color: "#A5A8B7",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },

  bottomNav: {
    height: 88,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F1F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 5,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  navText: {
    fontSize: 14,
    color: "#303143",
    fontFamily: "Inter_400Regular",
  },

  activeNavText: {
    color: BLUE,
  },
});
