import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { logoutAndRedirect } from "../../lib/navigation";
import { supabase } from "../../lib/supabase";

export default function AdminSettings() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleChangePassword = async () => {
    setUpdateMessage(null);
    setUpdateError(null);

    if (newPassword.length < 6) {
      setUpdateError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setUpdateError("Passwords do not match.");
      return;
    }

    setUpdating(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setUpdating(false);

    if (error) {
      setUpdateError(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setUpdateMessage("Password updated successfully.");
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.functions.invoke("delete-account", {
      body: { targetUserId: user.id },
    });
    setDeleting(false);

    if (error || data?.error) {
      setUpdateError(data?.error ?? "Failed to delete account.");
      return;
    }

    await logoutAndRedirect();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Settings" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Admin account and system preferences
        </Text>

        <Text style={styles.sectionTitle}>Security</Text>

        {updateMessage && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{updateMessage}</Text>
          </View>
        )}
        {updateError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{updateError}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="At least 6 characters"
            placeholderTextColor="rgba(255,255,255,0.25)"
          />

          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Re-enter new password"
            placeholderTextColor="rgba(255,255,255,0.25)"
          />

          <TouchableOpacity
            style={[styles.btn, updating && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#0D0D0D" />
            ) : (
              <Text style={styles.btnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <View style={styles.card}>
          {!showDeleteConfirm ? (
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text style={styles.dangerBtnText}>Delete Account</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={styles.confirmText}>
                This permanently deletes your admin account. This cannot be
                undone.
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.dangerBtn,
                    { flex: 1 },
                    deleting && styles.btnDisabled,
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                >
                  <Text style={styles.dangerBtnText}>
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

        <Text style={styles.sectionTitle}>Coming Soon</Text>
        <View style={styles.card}>
          <Text style={styles.placeholderText}>
            School profile customization, notification settings, and data export
            tools are on the roadmap.
          </Text>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
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
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 24,
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
  btn: {
    backgroundColor: "#C8F04D",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
  dangerBtn: {
    backgroundColor: "rgba(242,129,107,0.15)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.4)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerBtnText: { color: "#F2816B", fontSize: 14, fontWeight: "700" },
  cancelBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmText: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 18 },
  successBanner: {
    backgroundColor: "rgba(200,240,77,0.1)",
    borderWidth: 1,
    borderColor: "rgba(200,240,77,0.3)",
    borderRadius: 12,
    padding: 12,
  },
  successText: { color: "#C8F04D", fontSize: 13 },
  errorBanner: {
    backgroundColor: "rgba(242,129,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.3)",
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: "#F2816B", fontSize: 13 },
  placeholderText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    lineHeight: 18,
  },
  backBtn: { marginTop: 32, alignSelf: "flex-start" },
  backBtnText: { color: "#C8F04D", fontSize: 14, fontWeight: "600" },
});
