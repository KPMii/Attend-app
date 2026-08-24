import "@/app/faculty/students/[id]";
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
import { supabase } from "../../../lib/supabase";

type Student = {
  id: string;
  full_name: string;
  school_id_no: string | null;
};

const BLUE = "#305CDE";
const FADED_BLUE = "#F0F3FF";

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
      .in("role", ["student", "student_council_officer"])
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Students</Text>

          <View style={styles.countBadge}>
            <Image />

            <Text style={styles.countText}>
              {students.length.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Image />

          <TextInput
            style={styles.search}
            placeholder="Search by name or school ID"
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
          onRefresh={fetchStudents}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.studentCard}
              onPress={() => router.push(`/faculty/students/${item.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.studentInfo}>
                <Text style={styles.name}>{item.full_name || "(No name)"}</Text>

                <Text style={styles.idText}>
                  ID: {item.school_id_no || "—"}
                </Text>
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

  content: {
    marginTop: 30,
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
