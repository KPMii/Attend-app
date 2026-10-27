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
import { useAuthStore } from "../../../../stores/authStore";
import { LazyCameraView } from "../../../components/lazyCamera";
import { markSynced, saveAttendance } from "../../../lib/db";
import { checkRateLimit, recordAttempt } from "../../../lib/rateLimit";

import { supabase } from "../../../lib/supabase";

const { width } = Dimensions.get("window");
const SCAN_SIZE = width * 0.7;

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

function mapVerifyReason(reason: string): string {
  switch (reason) {
    case "expired":
      return "This session has expired";
    case "not_enrolled":
      return "You are not enrolled in this section";
    case "wrong_school":
      return "This session belongs to a different school";
    case "invalid_signature":
    default:
      return "Invalid or tampered QR code";
  }
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

      // Use cached identity — supabase.auth.getUser() hits the network and
      // throws when offline, which would abort the scan before saving.
      const userId = useAuthStore.getState().userId;
      if (!userId) throw new Error("Not logged in");

      // Rate limit: prevent spam scanning (max 3 scans in 30s)
      const rateKey = `qr_scan_${userId}`;
      const { allowed, retryAfterMs } = await checkRateLimit(rateKey, {
        maxAttempts: 3,
        windowMs: 30 * 1000,
      });
      if (!allowed) {
        const secs = Math.ceil(retryAfterMs / 1000);
        throw new Error(`Slow down! Try again in ${secs}s.`);
      }

      // 1. Local-only quick rejects (the server re-verifies authoritatively).
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        throw new Error("This session has expired");
      }

      const studentSchoolId = useAuthStore.getState().schoolId;
      if (session.schoolId && session.schoolId !== studentSchoolId) {
        throw new Error("This session belongs to a different school");
      }

      await recordAttempt(rateKey);

      const isLate = checkIfLate(session);
      setStatus(isLate ? "late" : "present");

      const attendanceId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const scannedAt = new Date().toISOString();

      // 2. Server-side verification + recording. The HMAC secret lives only on
      //    the backend, so the signature cannot be forged client-side. A
      //    network failure is treated as offline and the record is queued.
      let recordedOnServer = false;
      let rejection: string | null = null;
      try {
        const { data: res, error: fnError } = await supabase.functions.invoke(
          "verify-session",
          {
            body: {
              session,
              attendance: {
                id: attendanceId,
                session_id: session.id,
                scanned_at: scannedAt,
              },
            },
          },
        );

        const result = typeof res === "string" ? JSON.parse(res) : res;

        if (!fnError && result?.valid === false) {
          rejection = mapVerifyReason(result.reason);
        } else if (!fnError && result?.valid === true) {
          recordedOnServer = true;
        }
      } catch (invokeErr) {
        console.log("[Scanner] verify-session unavailable (offline?):", invokeErr);
      }

      if (rejection) {
        throw new Error(rejection);
      }

      // 3. Record locally (offline-first). If the server already recorded it,
      //    mark it synced so it isn't re-queued.
      await saveAttendance({
        id: attendanceId,
        session_id: session.id,
        student_id: userId,
        scanned_at: scannedAt,
        status: isLate ? "late" : "present",
        token_used: session.token,
        payload: data,
      });
      if (recordedOnServer) {
        await markSynced("attendance", attendanceId);
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

      <LazyCameraView
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
                  <Text style={styles.resultLabel}>Ã¢Å¡Â Ã¯Â¸Â Error</Text>
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
                      ? "Ã°Å¸â€¢â€œ Marked Late"
                      : "Ã¢Å“â€¦ Attendance Recorded"}
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
