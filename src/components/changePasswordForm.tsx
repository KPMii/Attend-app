import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../lib/supabase";

const BLUE = "#305CDE";
const WHITE = "#fff"
const FADED_BLUE = "#F0F3FF";
const INK = "#171C2E";
const MUTED = "#55596B";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false)

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
      <Text style={styles.label}>CURRENT PASSWORD</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter current password"
          placeholderTextColor="#A9ADB8"
        />
      </View>

      <Text style={styles.label}>NEW PASSWORD</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={next}
          onChangeText={setNext}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Minimum 6 characters"
          placeholderTextColor="#A9ADB8"
        />
      </View>

      <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Confirm new password"
          placeholderTextColor="#A9ADB8"
        />
      </View>
      
      <View style={styles.showPasswordColunn}>
        <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} activeOpacity={0.7} >
         <View style={[ styles.selectMark, showPassword && styles.selectMarkChecked, ]} >
           {showPassword && ( <Text style={styles.selectedMarkText}>✓</Text> )} 
          </View> 
         </TouchableOpacity> 
        <Text>Show password</Text>
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
        activeOpacity={0.8}
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
    marginLeft: 3,
    fontSize: 12,
    fontWeight: "600",
    color: MUTED,
    fontFamily: "Inter_400Regular",
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

  eyeButton: {
    width: 30,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  eyeIcon: {
    width: 20,
    height: 14,
    tintColor: "#8A8FA0",
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

  buttonDisabled: {
    opacity: 0.4,
  },

  buttonText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },

  showPasswordColunn: {
  flexDirection: "row",
  padding: "auto",
  gap: 5
  },

  selectMark: { 
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
 
  selectMarkChecked: {
    backgroundColor: "#305CDE",
    borderColor: "#305CDE", 
  }, 
  
  selectedMarkText: { 
    color: "#FFFFFF", 
    fontSize: 14, 
    fontWeight: "700", 
  },
});