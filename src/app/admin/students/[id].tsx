import { FunctionsHttpError } from "@supabase/supabase-js";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../../../stores/authStore";
import { logAction } from "../../../lib/audit";
import { PAGE_SIZE, getRange } from "../../../lib/pagination";
import { supabase } from "../../../lib/supabase";

const BLUE = "#305CDE";
const BLACK = "#000"
const FADED_BLUE = "#F0F3FF";
const BG = "#FBFBFF";
const WHITE = "#FFFFFF";
const INK = "#171C2E";
const MUTED = "#85899B";
const BORDER = "#F1F1F6";
const RED_FILL = "#FFD8D4";
const RED = "#D90000";

type AttendanceRecord = {
  id: string;
  status: string;
  scanned_at: string;
  sessions: { subject: string; room: string; created_at: string } | null;
};

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const [fullName, setFullName] = useState("");
  const [schoolIdNo, setSchoolIdNo] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showPassword, setShowPassword] = useState(false)

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [attendancePage, setAttendancePage] = useState(0);
  const [attendanceTotal, setAttendanceTotal] = useState(0);

  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [error, setError] = useState("");
  const [studentSections, setStudentSections] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    if (!id) return;
    loadProfile();
    loadSections();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadAttendance();
  }, [id, attendancePage]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, school_id_no, role")
      .eq("id", id)
      .single();

    if (data) {
      setFullName(data.full_name ?? "");
      setSchoolIdNo(data.school_id_no ?? "");
      setCurrentRole(data.role ?? "");
    }
  };

  const assignRole = async (newRole: string) => {
    setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCurrentRole(newRole);
    logAction("profile_updated", {
      tableName: "profiles",
      recordId: id as string,
      description: `Changed ${fullName} role to ${newRole}`,
    });
  };

  const loadSections = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("section_enrollments")
      .select("sections(id, name)")
      .eq("student_id", id);

    const names: { id: string; name: string }[] = (data ?? [])
      .map((e: any) => e.sections)
      .filter(Boolean);
    setStudentSections(names);
  };

  const loadAttendance = async () => {
    setLoadingRecords(true);
    const { from, to } = getRange(attendancePage);

    const { data, count } = await supabase
      .from("attendance")
      .select("id, status, scanned_at, sessions(subject, room, created_at)", {
        count: "exact",
      })
      .eq("student_id", id)
      .order("scanned_at", { ascending: false })
      .range(from, to);

    if (data) setRecords(data as any);
    setAttendanceTotal(count ?? 0);
    setLoadingRecords(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), school_id_no: schoolIdNo.trim() })
      .eq("id", id);

    setSaving(false);
    if (!saveError) {
      setSaved(true);
      logAction("profile_updated", {
        tableName: "profiles",
        recordId: id as string,
        description: `Updated student profile: ${fullName}`,
      });
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(saveError.message);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    const { data, error: fnError } = await supabase.functions.invoke(
      "delete-account",
      { body: { targetUserId: id } },
    );

    setDeleting(false);

    if (fnError || data?.error) {
      let message: string = data?.error ?? "Failed to delete account";
      if (fnError && !data?.error) {
        try {
          if (fnError instanceof FunctionsHttpError) {
            const ctx = (await fnError.context.json()) as { error?: string };
            if (ctx?.error) message = ctx.error;
          } else {
            message = fnError.message ?? message;
          }
        } catch {
          // keep the generic message if the response body isn't JSON
        }
      }
      setError(message);
      return;
    }

    logAction("profile_updated", {
      tableName: "profiles",
      recordId: id as string,
      description: `Deleted student account: ${fullName}`,
    });
    router.back();
  };

  const handleResetPassword = async () => {
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setResetting(true);
    const { data, error: fnError } = await supabase.functions.invoke(
      "reset-password",
      { body: { targetUserId: id, newPassword } },
    );
    setResetting(false);

    if (fnError || data?.error) {
      setError(data?.error ?? "Failed to reset password");
      return;
    }

    setNewPassword("");
    setResetDone(true);
    logAction("profile_updated", {
      tableName: "profiles",
      recordId: id as string,
      description: `Reset password for: ${fullName}`,
    });
    setTimeout(() => setResetDone(false), 2000);
  };

  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Student Detail" }} />
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
           activeOpacity={0.7}
        >
          <Image style={[{width: 24, height: 24}]} source={require("../../assets/icons/back.png")}/>
        </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Profile</Text>
          <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Text style={styles.sectionMainTitle}>Edit Student</Text>
        <Text style={styles.sectionSubtitle}>Manage profile, access and attendance records. </Text>
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
              {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>

        {studentSections.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Sections</Text>
            <View style={styles.sectionsRow}>
              {studentSections.map((s) => (
                <View key={s.id} style={styles.sectionChip}>
                  <Text style={styles.sectionChipText}>{s.name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {currentRole === "student" && hasPermission("users:assign_role") && (
          <>
            <Text style={styles.sectionTitle}>Role Assignment</Text>
            <View style={styles.card}>
              <Text style={styles.roleDescription}>
                Promote this student to Student Council Officer. They will gain
                access to scan QR codes at events, view school-wide attendance,
                and create event sessions.
              </Text>
              <TouchableOpacity
                style={styles.promoteBtn}
                onPress={() => assignRole("student_council_officer")}
              >
                <Text style={styles.promoteBtnText}>
                  Promote to Student Council Officer
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {currentRole === "student_council_officer" &&
          hasPermission("users:assign_role") && (
            <>
              <Text style={styles.sectionTitle}>Role Assignment</Text>
              <View style={[styles.card, styles.councilCard]}>
                <Text style={styles.councilBadge}>
                  Student Council Officer
                </Text>
                <Text style={styles.roleDescription}>
                  This student has elevated permissions for event management and
                  school-wide attendance oversight.
                </Text>
                <TouchableOpacity
                  style={styles.revertBtn}
                  onPress={() => assignRole("student")}
                >
                  <Text style={styles.revertBtnText}>Revert to Student</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        <Text style={styles.sectionTitle}>Reset Password</Text>
        <View style={styles.card}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputContainer}>
  <TextInput
    style={styles.input}
    value={newPassword}
    onChangeText={setNewPassword}
    placeholder={showPassword ? "At least 6 characters" : "••••••••"}
    placeholderTextColor="rgba(59, 49, 49, 0.25)"
    secureTextEntry={!showPassword}
  />

  <TouchableOpacity
    style={styles.eyeButton}
    onPress={() => setShowPassword((prev) => !prev)}
    activeOpacity={0.7}
  >
    <Image
      source={require("../../assets/icons/eye.png")}
      style={styles.eyeIcon}
    />
  </TouchableOpacity>
</View>

          <TouchableOpacity
            style={[styles.resetBtn, resetting && styles.saveBtnDisabled]}
            onPress={handleResetPassword}
            disabled={resetting}
          >
            <Text style={styles.resetBtnText}>
              {resetting
                ? "Resetting..."
                : resetDone
                  ? "Password Reset"
                  : "Reset Password"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.card}>
          {!showDeleteConfirm ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text style={styles.deleteBtnText}>Delete Account</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={styles.confirmText}>
                This permanently deletes {fullName}'s account. This cannot be
                undone.
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    { flex: 1 },
                    deleting && styles.saveBtnDisabled,
                  ]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  <Text style={styles.deleteBtnText}>
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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

        <View style={styles.pagerRow}>
          <TouchableOpacity
            style={[
              styles.pagerBtn,
              attendancePage === 0 && styles.pagerBtnDisabled,
            ]}
            onPress={() => setAttendancePage((p) => Math.max(0, p - 1))}
            disabled={attendancePage === 0}
          >
            <Text style={styles.pagerBtnText}>← Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pagerLabel}>
            {attendanceTotal === 0
              ? "0"
              : `${attendancePage * PAGE_SIZE + 1}–${Math.min((attendancePage + 1) * PAGE_SIZE, attendanceTotal)}`}{" "}
            of {attendanceTotal}
          </Text>
          <TouchableOpacity
            style={[
              styles.pagerBtn,
              (attendancePage + 1) * PAGE_SIZE >= attendanceTotal &&
                styles.pagerBtnDisabled,
            ]}
            onPress={() => setAttendancePage((p) => p + 1)}
            disabled={(attendancePage + 1) * PAGE_SIZE >= attendanceTotal}
          >
            <Text style={styles.pagerBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { padding: 24, gap: 12, paddingBottom: 48 },
  header: {
    height: 72,
    paddingHorizontal: 24,
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginTop: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: INK,
    fontFamily: "Inter_400Regular",
  },

  headerSpacer: {
    width: 42,
  },
  errorBanner: {
    backgroundColor: "rgba(242,129,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.3)",
    borderRadius: 12,
    padding: 12,
    color: "#F2816B",
    fontSize: 13,
  },
  sectionTitle: {
    color: BLACK,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 16,
  },
  sectionMainTitle: {
    color: BLACK,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 16,
  },
  sectionSubtitle: {
    color: BLACK,
    fontSize: 14,
    fontWeight: "semibold",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: WHITE,
    borderColor: FADED_BLUE,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  label: {
    color: BLACK,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 6,
  },
  inputContainer: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    backgroundColor: FADED_BLUE,
    borderWidth: 1,
    borderColor: FADED_BLUE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 45, // space for eye
    color: "#000",
    fontSize: 14,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    width: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeIcon: {
    width: 20,
    height: 14,
    tintColor: "#8A8FA0",
  },
  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: WHITE , fontSize: 14, fontWeight: "800" },
  roleDescription: {
    color: "#55596B",
    fontSize: 13,
    lineHeight: 18,
  },
  promoteBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  promoteBtnText: { color: WHITE, fontSize: 14, fontWeight: "800" },
  councilCard: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BG,
  },
  councilBadge: {
    color: BLUE,
    fontSize: 14,
    fontWeight: "700",
  },
  revertBtn: {
    backgroundColor: "rgba(242,129,107,0.15)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.4)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  revertBtnText: { color: "#F2816B", fontSize: 14, fontWeight: "700" },
  resetBtn: {
    backgroundColor: BLUE,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  resetBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  deleteBtn: {
    backgroundColor: "rgba(242,129,107,0.15)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.4)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  deleteBtnText: { color: "#F2816B", fontSize: 14, fontWeight: "700" },
  cancelBtn: {
    flex: 1,
    backgroundColor: FADED_BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    color: BLUE,
    fontSize: 14,
    fontWeight: "700",
  },
  confirmText: { color: BLACK, fontSize: 13, lineHeight: 18 },
  sectionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  sectionChip: {
    backgroundColor: FADED_BLUE,
    borderWidth: 1,
    borderColor: BLUE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sectionChipText: { color: BLUE, fontSize: 12, fontWeight: "600" },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryBox: {
    flex: 1,
    backgroundColor: FADED_BLUE,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  summaryNumber: { color: "#C8F04D", fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: BLUE, fontSize: 12, marginTop: 4 },
  recordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BLACK,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  recordSubject: { color: BLACK, fontSize: 14, fontWeight: "600" },
  recordMeta: { color: BLACK, fontSize: 12, marginTop: 2 },
  statusBadge: { fontSize: 13, fontWeight: "700" },
  empty: { color: BLACK, fontSize: 13, marginTop: 8 },
  pagerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  pagerBtn: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pagerBtnDisabled: { opacity: 0.3 },
  pagerBtnText: { color: BLACK, fontSize: 13, fontWeight: "600" },
  pagerLabel: { color: BLACK, fontSize: 12 },
});
