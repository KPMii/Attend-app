import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../../stores/authStore";
import { facultyLogin } from "../../lib/auth";
import type { Role } from "../../lib/permissions";
import {
  checkRateLimit,
  clearRateLimit,
  recordAttempt,
} from "../../lib/rateLimit";
import { supabase } from "../../lib/supabase";

export default function FacultyLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  // Clear any stale session from a previous user who quit without logging out
  useEffect(() => {
    useAuthStore.getState().logout();
  }, []);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = isValidEmail && password.length > 0 && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;

    // Rate limit: max 5 attempts per minute per email
    const rateKey = `faculty_login_${email.trim().toLowerCase()}`;
    const { allowed, retryAfterMs } = await checkRateLimit(rateKey);
    if (!allowed) {
      const secs = Math.ceil(retryAfterMs / 1000);
      setError(`Too many attempts. Try again in ${secs}s.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await facultyLogin(email.trim(), password);
      await clearRateLimit(rateKey);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id)
        .single();

      const role = profile?.role as Role;

      if (role === "admin") {
        router.replace("/admin");
      } else if (role === "student_council_officer") {
        router.replace("/faculty/student-council");
      } else {
        router.replace("/faculty");
      }
    } catch (err) {
      await recordAttempt(rateKey);
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Faculty Login</Text>
            <Text style={styles.subtitle}>
              Sign in to manage attendance sessions
            </Text>
          </View>
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Image
                source={require("../assets/icons/mail.png")}
                style={styles.inputIcon}
                resizeMode="contain"
              />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="you@school.edu"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => router}>
                <Text style={styles.forgotPassword}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Image
                source={require("../assets/icons/keyLock.png")}
                style={styles.inputIcon}
                resizeMode="contain"
              />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Enter your password"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Image
                  source={
                    showPassword
                      ? require("../assets/icons/eye.png")
                      : require("../assets/icons/eye.png")
                  }
                  style={styles.eyeIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
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

          <View style={styles.divider}>
            <View style={styles.dash} />
            <Text style={styles.dashText}>Are you a Student?</Text>
            <View style={styles.dash} />
          </View>

          <TouchableOpacity
            style={styles.facultySignButton}
            onPress={() => router.push("/student/login")}
          >
            <Text style={styles.facultySignText}>Sign in as Student</Text>
            <Image
              style={styles.facultySignIcon}
              source={require("../assets/icons/FacultyContact.png")}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9FF" },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { marginBottom: 32, gap: 4 },
  title: {
    color: "#111C2D",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  form: {
    gap: 8,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderColor: "#D8E3FB",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    color: "#434654",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 12,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#6B7280",
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { width: 20, height: 20, marginRight: 10 },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 14,
    color: "#6B7280",
    fontSize: 15,
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  forgotPassword: { color: "#0041C5", fontSize: 12, fontWeight: "600" },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  passwordIcon: { width: 20, height: 20, marginRight: 10 },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: "#6B7280",
    fontSize: 15,
  },
  eyeButton: { padding: 5 },
  eyeIcon: { width: 20, height: 20 },
  errorText: {
    color: "#F2816B",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  facultySignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  facultySignIcon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  facultySignText: {
    color: "#0041C5",
    fontSize: 14,
    fontWeight: "600",
  },
  loginBtn: {
    backgroundColor: "#305CDE",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 28,
  },

  dash: {
    flex: 1,
    height: 1,
    backgroundColor: "#C4C5D7",
  },

  dashText: {
    color: "#434654",
    fontSize: 14,
    fontWeight: "semibold",
  },
  loginBtnDisabled: { opacity: 0.35 },
  loginBtnText: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
});
