import * as Crypto from "expo-crypto";
import { Stack } from "expo-router";
import { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { markSynced, saveAttendance } from "../../../lib/db";
import { supabase } from "../../../lib/supabase";

const SECRET = process.env.EXPO_PUBLIC_QR_SECRET;

type SessionPayload = {
  id: string;
  subject: string;
  room: string;
  facultyId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  role: "faculty";
  signature: string;
  lateThresholdMinutes: number;
};

function checkIfLate(session: SessionPayload): boolean {
  const scannedAt = Date.now();
  const sessionStart = new Date(session.createdAt).getTime();
  const thresholdMs = session.lateThresholdMinutes * 60 * 1000;
  return scannedAt - sessionStart > thresholdMs;
}

async function verifySignature(session: SessionPayload): Promise<boolean> {
  const data = `${session.id}:${session.token}:${session.expiresAt}:${SECRET}`;
  const expectedSignature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data,
  );
  return expectedSignature === session.signature;
}

export default function DebugScan() {
  const [qrData, setQrData] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleTestScan = async () => {
    setLog([]);
    setLoading(true);
    addLog("🔍 Parsing QR data...");

    try {
      const session: SessionPayload = JSON.parse(qrData);
      addLog(`✅ Parsed session: ${session.id}`);

      addLog("🔐 Verifying signature...");
      const isValid = await verifySignature(session);
      if (!isValid) {
        addLog("❌ Signature mismatch — QR is invalid or tampered");
        setLoading(false);
        return;
      }
      addLog("✅ Signature valid");

      if (new Date(session.expiresAt).getTime() < Date.now()) {
        addLog("❌ Session has expired");
        setLoading(false);
        return;
      }
      addLog("✅ Session not expired");

      addLog("👤 Checking logged-in user...");
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        addLog("❌ Not logged in — log in as a student first");
        setLoading(false);
        return;
      }
      addLog(`✅ Logged in as: ${user.id}`);

      const isLate = checkIfLate(session);
      addLog(isLate ? "🕓 Status: LATE" : "✅ Status: PRESENT");

      const attendanceId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const scannedAt = new Date().toISOString();

      addLog("💾 Saving locally (offline-first)...");
      await saveAttendance({
        id: attendanceId,
        session_id: session.id,
        student_id: user.id,
        scanned_at: scannedAt,
        status: isLate ? "late" : "present",
        token_used: session.token,
      });
      addLog("✅ Saved to local SQLite");

      addLog("☁️ Syncing to Supabase...");
      try {
        const { error: insertError } = await supabase
          .from("attendance")
          .insert({
            id: attendanceId,
            session_id: session.id,
            student_id: user.id,
            scanned_at: scannedAt,
            status: isLate ? "late" : "present",
            token_used: session.token,
          });
        if (insertError) throw insertError;
        await markSynced("attendance", attendanceId);
        addLog("✅ Synced to Supabase successfully!");
      } catch (syncErr: any) {
        addLog(
          `⚠️ Sync failed (queued for later): ${syncErr.message ?? syncErr}`,
        );
      }

      addLog("🎉 Test scan complete!");
    } catch (err: any) {
      addLog(`❌ Error: ${err.message ?? "Invalid JSON or unexpected error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Debug Scan (Dev Only)" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>🧪 Debug Scan</Text>
        <Text style={styles.subtitle}>
          Paste the QR payload JSON from the faculty generator to simulate a
          scan
        </Text>

        <TextInput
          style={styles.textArea}
          placeholder='{"id":"sess_...", "subject":"Math", ...}'
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={qrData}
          onChangeText={setQrData}
          multiline
          numberOfLines={6}
        />

        <TouchableOpacity
          style={[
            styles.button,
            (!qrData.trim() || loading) && styles.buttonDisabled,
          ]}
          onPress={handleTestScan}
          disabled={!qrData.trim() || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Running..." : "Simulate Scan"}
          </Text>
        </TouchableOpacity>

        {log.length > 0 && (
          <View style={styles.logBox}>
            {log.map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, gap: 12 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 12 },
  textArea: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontSize: 12,
    fontFamily: "monospace",
    minHeight: 140,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#C8F04D",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.35 },
  buttonText: { color: "#0D0D0D", fontSize: 15, fontWeight: "800" },
  logBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    gap: 6,
  },
  logLine: { color: "#fff", fontSize: 13, fontFamily: "monospace" },
});
