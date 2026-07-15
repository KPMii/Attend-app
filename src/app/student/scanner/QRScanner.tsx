import { CameraView } from "expo-camera";
import * as Crypto from "expo-crypto";
import { Stack } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { markSynced, saveAttendance } from "../../../../lib/db";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";

const { width } = Dimensions.get("window");
const SCAN_SIZE = width * 0.7;

const SECRET = process.env.EXPO_PUBLIC_QR_SECRET;

type SessionPayload = {
  id: string;
  subject: string;
  subjectId: string | null;
  room: string;
  sectionId: string | null;
  facultyId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  role: "faculty";
  signature: string;
  lateThresholdMinutes: number;
  sessionType: "class" | "event";
  eventName: string | null;
  schoolId?: string;
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

export default function QRScanner() {
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"present" | "late" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setResult(data);
    Vibration.vibrate(100);

    try {
      const session: SessionPayload = JSON.parse(data);

      // 1. Verify the QR hasn't been tampered with or forged
      const isValid = await verifySignature(session);
      if (!isValid) {
        throw new Error("Invalid or tampered QR code");
      }

      // 2. Reject expired sessions outright
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        throw new Error("This session has expired");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // 3. Multi-tenant guard: block cross-school attendance
      const studentSchoolId = useAuthStore.getState().schoolId;
      if (session.schoolId && session.schoolId !== studentSchoolId) {
        throw new Error("This session belongs to a different school");
      }

      // 4. Roster check — only for CLASS sessions, events have no roster
      if (session.sessionType === "class" && session.sectionId) {
        const { data: enrollment } = await supabase
          .from("section_enrollments")
          .select("id")
          .eq("section_id", session.sectionId)
          .eq("student_id", user.id)
          .maybeSingle();

        if (!enrollment) {
          throw new Error("You are not enrolled in this section");
        }
      }

      const isLate = checkIfLate(session);
      setStatus(isLate ? "late" : "present");

      const attendanceId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const scannedAt = new Date().toISOString();

      // 5. Save locally first (offline-first)
      await saveAttendance({
        id: attendanceId,
        session_id: session.id,
        student_id: user.id,
        scanned_at: scannedAt,
        status: isLate ? "late" : "present",
        token_used: session.token,
      });

      // 6. Try syncing immediately, don't block confirmation
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
      } catch (syncErr) {
        console.log("[Attendance] Queued for later sync:", syncErr);
      }
    } catch (err) {
      console.error("Attendance error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not record attendance. Try again.",
      );
    }
  };

  const handleReset = () => {
    setScanned(false);
    setResult(null);
    setStatus(null);
    setError(null);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      <View style={styles.overlay}>
        <View style={styles.overlayTop} />

        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />

          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {!scanned && <View style={styles.scanLine} />}
          </View>

          <View style={styles.overlaySide} />
        </View>

        <View style={styles.overlayBottom}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <Text style={styles.headerSub}>Point your camera at a QR code</Text>
          </View>

          {scanned && result && (
            <View style={styles.resultCard}>
              {error ? (
                <>
                  <Text style={styles.resultLabel}>⚠️ Error</Text>
                  <Text style={styles.resultText}>{error}</Text>
                </>
              ) : (
                <>
                  <Text
                    style={[
                      styles.resultLabel,
                      { color: status === "late" ? "#F2816B" : "#C8F04D" },
                    ]}
                  >
                    {status === "late"
                      ? "🕓 Marked Late"
                      : "✅ Attendance Recorded"}
                  </Text>
                  <Text style={styles.resultText}>
                    {status === "late"
                      ? "You scanned after the late threshold."
                      : "You're marked present. See you in class!"}
                  </Text>
                </>
              )}
              <TouchableOpacity
                style={styles.scanAgainBtn}
                onPress={handleReset}
              >
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {!scanned && (
            <Text style={styles.hint}>Align QR code within the frame</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;
const CORNER_COLOR = "#004187";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0D0D0D",
  },
  msgText: { color: "#fff", fontSize: 16 },
  permissionScreen: {
    flex: 1,
    backgroundColor: "#0D0D0D",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionInner: { alignItems: "center", paddingHorizontal: 40, gap: 16 },
  permissionIcon: { fontSize: 64, marginBottom: 8 },
  permissionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  permissionSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: "#C8F04D",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  permissionBtnText: { color: "#0D0D0D", fontSize: 16, fontWeight: "700" },
  overlay: { flex: 1 },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  overlayMiddle: { flexDirection: "row", height: SCAN_SIZE },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)" },
  scanWindow: { width: SCAN_SIZE, height: SCAN_SIZE },
  overlayBottom: {
    flex: 1.4,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 24,
    gap: 20,
  },
  header: { alignItems: "center", gap: 6 },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSub: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: CORNER_COLOR,
    opacity: 0.8,
    borderRadius: 1,
  },
  corner: { position: "absolute", width: CORNER_SIZE, height: CORNER_SIZE },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: CORNER_COLOR,
    borderBottomRightRadius: 6,
  },
  resultCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 20,
    width: "100%",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(200,240,77,0.25)",
  },
  resultLabel: {
    color: "#C8F04D",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  resultText: { color: "#fff", fontSize: 15, lineHeight: 22 },
  scanAgainBtn: {
    backgroundColor: "#C8F04D",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  scanAgainText: { color: "#0D0D0D", fontSize: 15, fontWeight: "700" },
  hint: { color: "rgba(255,255,255,0.3)", fontSize: 13, letterSpacing: 0.2 },
});
