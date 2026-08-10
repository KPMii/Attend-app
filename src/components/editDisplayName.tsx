import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../lib/supabase";

export default function EditDisplayName() {
  const userId = useAuthStore((s) => s.userId);
  const fullName = useAuthStore((s) => s.fullName);
  const [name, setName] = useState(fullName ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!userId || !name.trim()) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ full_name: name.trim() })
      .eq("id", userId);
    if (saveError) { setError(saveError.message); }
    else { setSaved(true); useAuthStore.getState().hydrate(); }
    setBusy(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Display Name</Text>
      <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="rgba(255,255,255,0.25)" value={name} onChangeText={setName} />
      {error && <Text style={styles.error}>{error}</Text>}
      {saved && <Text style={styles.saved}>✓ Name updated</Text>}
      <TouchableOpacity style={[styles.btn, (!name.trim() || busy) && styles.btnDisabled]} onPress={handleSave} disabled={!name.trim() || busy}>
        <Text style={styles.btnText}>{busy ? "Saving..." : "Save Name"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, gap: 10 },
  title: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  input: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 14 },
  error: { color: "#F2816B", fontSize: 13 },
  saved: { color: "#C8F04D", fontSize: 13 },
  btn: { backgroundColor: "#C8F04D", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
});
