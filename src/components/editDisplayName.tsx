import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../lib/supabase";

const BLUE = "#305CDE";
const FADED_BLUE = "#F0F3FF";
const INK = "#171C2E";

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
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setSaved(false);
            setError(null);
          }}
          placeholder="Your full name"
          placeholderTextColor="#A9ADB8"
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {saved && <Text style={styles.saved}>Name updated</Text>}

      <TouchableOpacity
        style={[
          styles.saveButton,
          (!name.trim() || busy) && styles.saveButtonDisabled,
        ]}
        onPress={handleSave}
        disabled={!name.trim() || busy}
        activeOpacity={0.8}
      >
        <Text style={styles.saveText}>
          {busy ? "Saving..." : "Save Name"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },

  inputContainer: {
    height: 53,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FADED_BLUE,
    borderRadius: 12,
    paddingHorizontal: 15,
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

  saveButton: {
    height: 55,
    marginTop: 4,
    borderRadius: 13,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },

  saveButtonDisabled: {
    opacity: 0.4,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
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