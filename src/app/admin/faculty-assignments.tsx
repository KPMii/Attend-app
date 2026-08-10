import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  createAssignment,
  deleteAssignment,
  getFacultyAssignments,
  type FacultyAssignment,
} from "../../lib/facultyAssignments";
import { supabase } from "../../lib/supabase";

type Faculty = { id: string; full_name: string };
type Subject = { id: string; name: string };
type Section = { id: string; name: string; room: string | null };

export default function ManageAssignments() {
  const router = useRouter();
  const params = useLocalSearchParams<{ facultyId?: string }>();
  const initialFacultyId = params.facultyId;

  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(
    initialFacultyId ?? null,
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );

  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFaculties = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "faculty")
      .order("full_name");
    if (data) setFacultyList(data);
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("id, name")
      .order("name");
    if (data) setSubjects(data);
  };

  const loadSections = async () => {
    const { data } = await supabase
      .from("sections")
      .select("id, name, room")
      .order("name");
    if (data) setSections(data);
  };

  const loadAssignments = async (facultyId: string) => {
    const result = await getFacultyAssignments(facultyId);
    setAssignments(result);
  };

  useEffect(() => {
    Promise.all([loadFaculties(), loadSubjects(), loadSections()]).then(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedFacultyId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    loadAssignments(selectedFacultyId).then(() => setLoading(false));
  }, [selectedFacultyId]);

  const selectedFacultyName =
    facultyList.find((f) => f.id === selectedFacultyId)?.full_name ??
    "Select a faculty member";

  const selectedSubjectName =
    subjects.find((s) => s.id === selectedSubjectId)?.name ?? "";
  const selectedSectionName =
    sections.find((s) => s.id === selectedSectionId)?.name ?? "";

  const handleAdd = async () => {
    if (!selectedFacultyId || !selectedSubjectId || !selectedSectionId) {
      setError("Select faculty, subject, and section first.");
      return;
    }
    setError(null);
    setSaving(true);
    const result = await createAssignment(
      selectedFacultyId,
      selectedSubjectId,
      selectedSectionId,
    );
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSelectedSubjectId(null);
    setSelectedSectionId(null);
    loadAssignments(selectedFacultyId);
  };

  const handleDelete = async (assignmentId: string) => {
    await deleteAssignment(assignmentId);
    if (selectedFacultyId) loadAssignments(selectedFacultyId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Manage Assignments" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Faculty Assignments</Text>
        <Text style={styles.subtitle}>
          Assign subjects and sections so faculty only see their own classes.
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Faculty picker */}
        <Text style={styles.label}>Faculty</Text>
        <View style={styles.chipRow}>
          {facultyList.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.chip,
                selectedFacultyId === f.id && styles.chipActive,
              ]}
              onPress={() => {
                setSelectedFacultyId(f.id);
                setAssignments([]);
                setSelectedSubjectId(null);
                setSelectedSectionId(null);
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedFacultyId === f.id && styles.chipTextActive,
                ]}
              >
                {f.full_name}
              </Text>
            </TouchableOpacity>
          ))}
          {facultyList.length === 0 && (
            <Text style={styles.hint}>No faculty accounts found.</Text>
          )}
        </View>

        {selectedFacultyId && (
          <>
            {/* Subject + Section pickers */}
            <Text style={styles.label}>Assign a Subject in a Section</Text>

            <Text style={styles.miniLabel}>Subject</Text>
            <View style={styles.chipRow}>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.chip,
                    selectedSubjectId === s.id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedSubjectId(s.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedSubjectId === s.id && styles.chipTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {subjects.length === 0 && (
                <Text style={styles.hint}>No subjects yet.</Text>
              )}
            </View>

            <Text style={styles.miniLabel}>Section</Text>
            <View style={styles.chipRow}>
              {sections.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.chip,
                    selectedSectionId === s.id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedSectionId(s.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedSectionId === s.id && styles.chipTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {sections.length === 0 && (
                <Text style={styles.hint}>No sections yet.</Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.addBtn,
                (!selectedSubjectId || !selectedSectionId || saving) &&
                  styles.addBtnDisabled,
              ]}
              onPress={handleAdd}
              disabled={!selectedSubjectId || !selectedSectionId || saving}
            >
              <Text style={styles.addBtnText}>
                {saving ? "Adding..." : "Add Assignment"}
              </Text>
            </TouchableOpacity>

            {/* Current assignments */}
            <Text style={styles.label}>
              Current Assignments ({assignments.length})
            </Text>

            {loading ? (
              <Text style={styles.hint}>Loading...</Text>
            ) : assignments.length === 0 ? (
              <Text style={styles.hint}>
                No assignments yet for {selectedFacultyName}.
              </Text>
            ) : (
              <View style={styles.assignmentList}>
                {assignments.map((a) => (
                  <View key={a.id} style={styles.assignmentRow}>
                    <View>
                      <Text style={styles.assignmentSubject}>
                        {a.subject_name}
                      </Text>
                      <Text style={styles.assignmentSection}>
                        {a.section_name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(a.id)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>ΓåÉ Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, gap: 8, paddingBottom: 48 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  errorText: {
    color: "#F2816B",
    fontSize: 12,
    backgroundColor: "rgba(242,129,107,0.1)",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 24,
  },
  miniLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 12,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipActive: {
    backgroundColor: "rgba(200,240,77,0.14)",
    borderColor: "#C8F04D",
  },
  chipText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#C8F04D" },
  hint: { color: "rgba(255,255,255,0.3)", fontSize: 13 },
  addBtn: {
    backgroundColor: "#C8F04D",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  addBtnDisabled: { opacity: 0.35 },
  addBtnText: { color: "#0D0D0D", fontSize: 15, fontWeight: "800" },
  assignmentList: { gap: 8, marginTop: 6 },
  assignmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
  },
  assignmentSubject: { color: "#fff", fontSize: 14, fontWeight: "600" },
  assignmentSection: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 2,
  },
  removeText: { color: "#F2816B", fontSize: 13, fontWeight: "600" },
  backBtn: { marginTop: 32, alignSelf: "flex-start" },
  backBtnText: { color: "#C8F04D", fontSize: 14, fontWeight: "600" },
});
