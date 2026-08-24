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
      .update({
        full_name: name.trim(),
      })
      .eq("id", userId);

    if (saveError) {
      setError(saveError.message);
    } else {
      setSaved(true);

      useAuthStore.getState().hydrate();
    }

    setBusy(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setSaved(false);
            setError(null);
          }}
          placeholder="Your full name"
          placeholderTextColor="#9699A7"
          autoCapitalize="words"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!name.trim() || busy) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!name.trim() || busy}
          activeOpacity={0.75}
        >
          <Text style={styles.saveText}>{busy ? "..." : "SAVE"}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {saved && <Text style={styles.saved}>✓ Name updated</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },

  inputRow: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
  },

  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    color: "#000",
    fontSize: 14,
  },

  saveButton: {
    height: "100%",
    paddingHorizontal: 18,
    backgroundColor: "#305CDE",
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    opacity: 0.4,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  error: {
    fontSize: 13,
    color: "#D90000",
    marginLeft: 3,
  },

  saved: {
    fontSize: 13,
    color: "#287A3E",
    marginLeft: 3,
  },
});
