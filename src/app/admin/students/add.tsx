import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
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
import { supabase } from "../../../lib/supabase";

const BLUE = "#305CDE";
const FADED_BLUE = "#F0F3FF";

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
            <Image />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Add Student</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>New Student</Text>

          <Text style={styles.subtitle}>
            Create a student account and assign their school ID.
          </Text>

          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>School ID No.</Text>

              <View style={styles.inputContainer}>
                <Image />

                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2024-00142"
                  placeholderTextColor="#AEB2C2"
                  value={schoolIdNo}
                  onChangeText={(t) =>
                    setSchoolIdNo(t.replace(/[^A-Za-z0-9]/g, "").slice(0, 12))
                  }
                  autoCapitalize="characters"
                  maxLength={12}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>

              <View style={styles.inputContainer}>
                <Image />

                <TextInput
                  style={styles.input}
                  placeholder="e.g. Juan Dela Cruz"
                  placeholderTextColor="#AEB2C2"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Temporary Password</Text>

              <View style={styles.inputContainer}>
                <Image />

                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#AEB2C2"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {error && (
              <View style={styles.messageBoxError}>
                <Image />

                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {success && (
              <View style={styles.messageBoxSuccess}>
                <Image />

                <Text style={styles.successText}>
                  Student account created successfully!
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.createButton,
                !canSubmit && styles.createButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={!canSubmit || loading}
              activeOpacity={0.8}
            >
              <Image />

              <Text style={styles.createButtonText}>
                {loading ? "Creating..." : "Create Student"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBFBFF",
  },

  flex: {
    flex: 1,
  },

  header: {
    height: 72,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F1F6",
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
    color: "#171A2B",
    fontFamily: "Inter_400Regular",
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 34,
  },

  title: {
    fontSize: 31,
    fontWeight: "700",
    color: "#111525",
    fontFamily: "Inter_400Regular",
  },

  subtitle: {
    marginTop: 7,
    maxWidth: 330,
    fontSize: 15,
    lineHeight: 22,
    color: "#747789",
    fontFamily: "Inter_400Regular",
  },

  formCard: {
    marginTop: 28,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0F1F6",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 17,
  },

  field: {
    gap: 8,
  },

  label: {
    marginLeft: 3,
    fontSize: 13,
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
    color: "#171C2E",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },

  messageBoxError: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#FFF0F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  errorText: {
    flex: 1,
    color: "#C93636",
    fontSize: 13,
    lineHeight: 18,
  },

  messageBoxSuccess: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#EEF9F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  successText: {
    flex: 1,
    color: "#287A3E",
    fontSize: 13,
    lineHeight: 18,
  },

  createButton: {
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
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },

  createButtonDisabled: {
    opacity: 0.4,
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
});
