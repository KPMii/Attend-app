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
import { studentLogin } from "../../../lib/auth";

export default function StudentLogin() {
  const router = useRouter();
  const [schoolIdNo, setSchoolIdNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidSchoolId = /^[A-Za-z0-9]{5,12}$/.test(schoolIdNo.trim());
  const canSubmit = isValidSchoolId && password.length > 0 && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      await studentLogin(schoolIdNo.trim(), password);
      router.replace("/student");
    } catch (err) {
      setError("Invalid School ID or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Student Login</Text>
            <Text style={styles.subtitle}>Sign in to mark your attendance</Text>
          </View>

          <View style={styles.form}>
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
            {schoolIdNo.length > 0 && !isValidSchoolId && (
              <Text style={styles.fieldError}>
                School ID must be 5–12 letters/numbers
              </Text>
            )}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.loginBtn, !canSubmit && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={!canSubmit}
            >
              <Text style={styles.loginBtnText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { marginBottom: 32, gap: 4 },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
  form: { gap: 8 },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 12,
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
  fieldError: { color: "#F2816B", fontSize: 12, marginTop: 4 },
  errorText: {
    color: "#F2816B",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: "#C8F04D",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  loginBtnDisabled: { opacity: 0.35 },
  loginBtnText: { color: "#0D0D0D", fontSize: 16, fontWeight: "800" },
});
