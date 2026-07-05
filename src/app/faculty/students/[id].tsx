import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

type AttendanceRecord = {
  id: string;
  status: string;
  scanned_at: string;
  sessions: { subject: string; room: string; created_at: string } | null;
};

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [schoolIdNo, setSchoolIdNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadProfile();
    loadAttendance();
  }, [id]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, school_id_no")
      .eq("id", id)
      .single();

    if (data) {
      setFullName(data.full_name ?? "");
      setSchoolIdNo(data.school_id_no ?? "");
    }
  };

  const loadAttendance = async () => {
    setLoadingRecords(true);
    const { data } = await supabase
      .from("attendance")
      .select("id, status, scanned_at, sessions(subject, room, created_at)")
      .eq("student_id", id)
      .order("scanned_at", { ascending: false })
      .limit(50);

    if (data) setRecords(data as any);
    setLoadingRecords(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), school_id_no: schoolIdNo.trim() })
      .eq("id", id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Student Detail" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Edit Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholderTextColor="rgba(255,255,255,0.25)"
          />

          <Text style={styles.label}>School ID No.</Text>
          <TextInput
            style={styles.input}
            value={schoolIdNo}
            onChangeText={setSchoolIdNo}
            autoCapitalize="characters"
            placeholderTextColor="rgba(255,255,255,0.25)"
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Attendance Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryNumber}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#F2816B" }]}>
              {lateCount}
            </Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Attendance</Text>
        {loadingRecords ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : records.length === 0 ? (
          <Text style={styles.empty}>No attendance records yet</Text>
        ) : (
          records.map((r) => (
            <View key={r.id} style={styles.recordRow}>
              <View>
                <Text style={styles.recordSubject}>
                  {r.sessions?.subject ?? "Unknown"}
                </Text>
                <Text style={styles.recordMeta}>
                  {r.sessions?.room ?? ""} ·{" "}
                  {new Date(r.scanned_at).toLocaleString()}
                </Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  { color: r.status === "late" ? "#F2816B" : "#C8F04D" },
                ]}
              >
                {r.status === "late" ? "Late" : "Present"}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, gap: 12, paddingBottom: 48 },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 16,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 6,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: "#C8F04D",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  summaryNumber: { color: "#C8F04D", fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  recordSubject: { color: "#fff", fontSize: 14, fontWeight: "600" },
  recordMeta: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: "700" },
  empty: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 8 },
});
