import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const canSubmit =
    current.length > 0 && next.length >= 6 && next === confirm && !busy;

  const handleChange = async () => {
    if (!canSubmit) return;

    setBusy(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error("Could not identify your account.");
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });

      if (verifyError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });

      if (updateError) throw updateError;

      setCurrent("");
      setNext("");
      setConfirm("");

      setMessage({
        ok: true,
        text: "Password updated successfully.",
      });
    } catch (err: any) {
      setMessage({
        ok: false,
        text: err?.message ?? "Something went wrong.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Current Password</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry={!showCurrent}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter current password"
          placeholderTextColor="#9699A7"
        />

        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowCurrent(!showCurrent)}
        ></TouchableOpacity>
      </View>
      <Text style={styles.label}>New Password</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={next}
          onChangeText={setNext}
          secureTextEntry={!showNext}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Minimum 6 characters"
          placeholderTextColor="#9699A7"
        />

        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowNext(!showNext)}
        ></TouchableOpacity>
      </View>

      <Text style={styles.label}>Confirm New Password</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Confirm new password"
          placeholderTextColor="#9699A7"
        />

        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirm(!showConfirm)}
        ></TouchableOpacity>
      </View>

      {message && (
        <Text
          style={[styles.message, message.ok ? styles.success : styles.error]}
        >
          {message.text}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleChange}
        disabled={!canSubmit}
        activeOpacity={0.75}
      >
        <Text style={styles.buttonText}>
          {busy ? "Updating..." : "Update Password"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },

  label: {
    marginTop: 5,
    marginLeft: 3,
    fontSize: 12,
    fontWeight: "500",
    color: "#555967",
  },

  inputContainer: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 10,
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    color: "#000",
    fontSize: 14,
  },

  eyeButton: {
    width: 45,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  message: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },

  success: {
    color: "#287A3E",
  },

  error: {
    color: "#D90000",
  },

  button: {
    height: 48,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#305CDE",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonDisabled: {
    opacity: 0.4,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
