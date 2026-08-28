import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { logAction } from "../../../lib/audit";
import { supabase } from "../../../lib/supabase";

const BLUE = "#305CDE";
const FADED_BLUE = "#F0F3FF";
const BG = "#FBFBFF";
const WHITE = "#FFFFFF";
const INK = "#171C2E";
const MUTED = "#85899B";
const BORDER = "#F1F1F6";
const RED_FILL = "#FFD8D4";
const RED = "#D90000";

export default function FacultyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [showPassword, setShowPassword] = useState(false)

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Image style={[{width: 24, height: 24}]} source={require("../../assets/icons/back.png")}/>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Faculty Detail</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.messageBoxError}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.title}>Faculty Profile</Text>

          <Text style={styles.subtitle}>
            Manage this faculty member's account details.
          </Text>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Image
                  source={require("../../assets/icons/Profile.png")}
                  style={styles.sectionIcon}
                />
              </View>
              <Text style={styles.sectionHeading}>Profile</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>FULL NAME</Text>

              <View style={styles.inputContainer}>
                <Image />

                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Faculty full name"
                  placeholderTextColor="#AEB2C2"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBox}>
                <Image
                  source={require("../../assets/icons/keyLock.png")}
                  style={styles.sectionIcon}
                />
              </View>
              <Text style={styles.sectionHeading}>Security</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>NEW PASSWORD</Text>

              <View style={styles.inputContainer}>

                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={showPassword ? "At least 6 characters" : "••••••••"}
                  placeholderTextColor="#AEB2C2"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  >
                  <Image
                    source={require("../../assets/icons/eye.png")}
                     style={styles.eyeIcon}
                  />
                </TouchableOpacity>
                
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, resetting && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={resetting}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {resetting
                  ? "Resetting..."
                  : resetDone
                    ? "Password Reset"
                    : "Reset Password"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionCard}>

            {!showDeleteConfirm ? (
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() => setShowDeleteConfirm(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dangerButtonText}>Delete Account</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.confirmBlock}>
                <Text style={styles.confirmText}>
                  This permanently deletes {fullName}'s account. This cannot be
                  undone.
                </Text>

                <View style={styles.confirmRow}>
                  <TouchableOpacity
                    style={[
                      styles.dangerButton,
                      styles.confirmDeleteButton,
                      deleting && styles.buttonDisabled,
                    ]}
                    onPress={handleDelete}
                    disabled={deleting}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dangerButtonText}>
                      {deleting ? "Deleting..." : "Confirm Delete"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelButton, styles.confirmCancelButton]}
                    onPress={() => setShowDeleteConfirm(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  flex: {
    flex: 1,
  },

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

  scroll: {
    paddingHorizontal: 30,
    paddingTop: 34,
    paddingBottom: 48,
  },

  messageBoxError: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#FFF0F0",
    marginBottom: 18,
  },

  errorText: {
    color: "#C93636",
    fontSize: 13,
    lineHeight: 18,
  },

  title: {
    fontSize: 31,
    fontWeight: "700",
    color: "#111525",
    fontFamily: "Inter_400Regular",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },

  sectionCard: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: FADED_BLUE,
    gap: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },

  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: FADED_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionIcon: {
    width: 14,
    height: 19,
  },

  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: INK,
    fontFamily: "Inter_400Regular",
  },

  field: {
    gap: 8,
  },

  label: {
    marginLeft: 3,
    fontSize: 12,
    fontWeight: "600",
    color: "#55596B",
    fontFamily: "Inter_400Regular",
  },

  inputContainer: {
    height: 53,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: FADED_BLUE,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 0,
    color: INK,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },

  primaryButton: {
    height: 55,
    marginTop: 4,
    borderRadius: 13,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: BLUE,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.4,
  },

  primaryButtonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  eyeButton: {
    width: 30,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  eyeIcon: {
    width: 20,
    height: 14,
    tintColor: "#8A8FA0",
  },

  dangerButton: {
    height: 55,
    borderRadius: 13,
    backgroundColor: RED_FILL,
    alignItems: "center",
    justifyContent: "center",
  },

  dangerButtonText: {
    color: RED,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  cancelButton: {
    height: 55,
    borderRadius: 13,
    backgroundColor: FADED_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: INK,
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  confirmBlock: {
    gap: 12,
  },

  confirmRow: {
    flexDirection: "row",
    gap: 10,
  },

  confirmDeleteButton: {
    flex: 1,
  },

  confirmCancelButton: {
    flex: 1,
  },

  confirmText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
  },
});