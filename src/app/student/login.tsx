import { useRouter } from "expo-router";
import { useEffect, useState, } from "react";
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
import { studentLogin } from "../../lib/auth";
import {
  checkRateLimit,
  clearRateLimit,
  recordAttempt,
} from "../../lib/rateLimit";

export default function StudentLogin() {
  const router = useRouter();
  const [schoolIdNo, setSchoolIdNo] = useState("");

  // Clear any stale session from a previous user who quit without logging out
  useEffect(() => {
    useAuthStore.getState().logout();
  }, []);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidSchoolId = /^[A-Za-z0-9]{5,12}$/.test(schoolIdNo.trim());
  const canSubmit = isValidSchoolId && password.length > 0 && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;

    // Rate limit: max 5 attempts per minute per school ID
    const rateKey = `student_login_${schoolIdNo.trim().toUpperCase()}`;
    const { allowed, retryAfterMs } = await checkRateLimit(rateKey);
    if (!allowed) {
      const secs = Math.ceil(retryAfterMs / 1000);
      setError(`Too many attempts. Try again in ${secs}s.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await studentLogin(schoolIdNo.trim(), password);
      await clearRateLimit(rateKey);

      // Wait for auth store to hydrate so we know the role
      await useAuthStore.getState().hydrate();
      const role = useAuthStore.getState().role;

      // Redirect based on role — student council officers and faculty
      // should NOT land on the student screens
      if (role === "student_council_officer") {
        router.replace("/faculty/student-council");
      } else if (role === "admin") {
        router.replace("/admin");
      } else if (role === "faculty") {
        router.replace("/faculty");
      } else {
        router.replace("/student");
      }
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      await recordAttempt(rateKey);
      setError("Invalid School ID or password. Please try again.");
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
            <Text style={styles.title}>Student Sign in</Text>
            <Text style={styles.subtitle}>Sign in to mark your attendance</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>School ID No.</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 123456"
              placeholderTextColor="#6B7280"
              value={schoolIdNo}
              onChangeText={(t) =>
                setSchoolIdNo(t.replace(/[^A-Za-z0-9]/g, "").slice(0, 12))
              }
              autoCapitalize="characters"
              maxLength={12}
            />
            {schoolIdNo.length > 0 && !isValidSchoolId && (
              <Text style={styles.fieldError}>
                School ID must be 5-12 letters/numbers
              </Text>
            )}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <Image
                source={require("../assets/icons/keyLock.png")}
                style={styles.passwordIcon}
                resizeMode="contain"
              /> 
              <TextInput
                style={styles.passwordInput}
                placeholder={showPassword ? "123456" : "••••••••"}
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
            <Text style={styles.dashText}>Are you a faculty?</Text>
            <View style={styles.dash} />
          </View>

          <TouchableOpacity
            style={styles.facultySignButton}
            onPress={() => router.push("/faculty/login")}
          >
            <Text style={styles.facultySignText}>Sign in as Faculty</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#F9F9FF",
  },

  flex: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  header: {
    marginBottom: 32,
    gap: 4,
  },

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

  fieldError: {
    color: "#F2816B",
    fontSize: 12,
    marginTop: 4,
  },

  errorText: {
    color: "#F2816B",
    fontSize: 13,
    marginTop: 12,
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: "#305CDE",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },

  loginBtnDisabled: {
    opacity: 0.35,
  },

  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "semibold",
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
});
