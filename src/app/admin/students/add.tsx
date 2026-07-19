import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";

export default function AddStudent() {
  const router = useRouter();
  const [schoolIdNo, setSchoolIdNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit =
    /^[A-Za-z0-9]{5,12}$/.test(schoolIdNo.trim()) &&
    fullName.trim().length > 0 &&
    password.length >= 6;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { data, error: fnError } = await supabase.functions.invoke(
      "create-student",
      {
        body: {
          schoolIdNo: schoolIdNo.trim(),
          fullName: fullName.trim(),
          password,
        },
      },
    );

    console.log("DEBUG data:", JSON.stringify(data));
    console.log("DEBUG fnError:", fnError);
    console.log("DEBUG fnError context:", fnError?.context);

    setLoading(false);

    if (fnError || data?.error) {
      setError(data?.error ?? fnError?.message ?? "Something went wrong.");
      return;
    }

    setSuccess(true);
    setSchoolIdNo("");
    setFullName("");
    setPassword("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Add Student</Text>
          <Text style={styles.subtitle}>Create a new student account</Text>

          <Text style={styles.label}>School ID No.</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 123456"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={schoolIdNo}
            onChangeText={(t) =>
              setSchoolIdNo(t.replace(/[^A-Za-z0-9]/g, "").slice(0, 12))
            }
            autoCapitalize="characters"
            maxLength={12}
          />

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Juan Dela Cruz"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Temporary Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && <Text style={styles.errorText}>{error}</Text>}
          {success && (
            <Text style={styles.successText}>✓ Student account created!</Text>
          )}

          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit || loading}
          >
            <Text style={styles.btnText}>
              {loading ? "Creating..." : "Create Student"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 8 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 16 },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
  },
  errorText: {
    color: "#F2816B",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  successText: {
    color: "#C8F04D",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#C8F04D",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: "#0D0D0D", fontSize: 16, fontWeight: "800" },
});
