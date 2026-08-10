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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

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
      if (!user?.email) throw new Error("Could not identify your account.");

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (verifyError) throw new Error("Current password is incorrect.");

      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });
      if (updateError) throw updateError;

      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({ ok: true, text: "Password updated successfully." });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message ?? "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Change Password</Text>
      <TextInput style={styles.input} secureTextEntry placeholder="Current password" placeholderTextColor="rgba(255,255,255,0.25)" value={current} onChangeText={setCurrent} autoCapitalize="none" autoCorrect={false} />
      <TextInput style={styles.input} secureTextEntry placeholder="New password (min 6 characters)" placeholderTextColor="rgba(255,255,255,0.25)" value={next} onChangeText={setNext} autoCapitalize="none" autoCorrect={false} />
      <TextInput style={styles.input} secureTextEntry placeholder="Confirm new password" placeholderTextColor="rgba(255,255,255,0.25)" value={confirm} onChangeText={setConfirm} autoCapitalize="none" autoCorrect={false} />
      {message && <Text style={[styles.message, { color: message.ok ? "#C8F04D" : "#F2816B" }]}>{message.text}</Text>}
      <TouchableOpacity style={[styles.btn, !canSubmit && styles.btnDisabled]} onPress={handleChange} disabled={!canSubmit}>
        <Text style={styles.btnText}>{busy ? "Updating..." : "Update Password"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, gap: 10 },
  title: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  input: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 14 },
  message: { fontSize: 13, lineHeight: 18 },
  btn: { backgroundColor: "#C8F04D", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 2 },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
});
