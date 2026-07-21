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
import { logAction } from "../../../../lib/audit";
import { supabase } from "../../../../lib/supabase";

export default function FacultyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", id)
      .single();

    if (data) {
      setFullName(data.full_name ?? "");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");

    const { error: saveError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", id);

    setSaving(false);
    if (!saveError) {
      setSaved(true);
      logAction("profile_updated", {
        tableName: "profiles",
        recordId: id as string,
        description: `Updated faculty profile: ${fullName}`,
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
      setError(data?.error ?? "Failed to delete account");
      return;
    }

    logAction("profile_updated", {
      tableName: "profiles",
      recordId: id as string,
      description: `Deleted faculty account: ${fullName}`,
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

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Faculty Detail" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Edit Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
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

        <Text style={styles.sectionTitle}>Reset Password</Text>
        <View style={styles.card}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="rgba(255,255,255,0.25)"
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.resetBtn, resetting && styles.saveBtnDisabled]}
            onPress={handleResetPassword}
            disabled={resetting}
          >
            <Text style={styles.resetBtnText}>
              {resetting ? "Resetting..." : resetDone ? "✓ Password Reset" : "Reset Password"}
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
                This permanently deletes {fullName}'s account. This cannot be undone.
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[styles.deleteBtn, { flex: 1 }, deleting && styles.saveBtnDisabled]}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, gap: 12, paddingBottom: 48 },
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
  resetBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
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
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "700" },
  confirmText: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 18 },
});