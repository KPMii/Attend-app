import { useCameraPermissions } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Linking,
  Modal,
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
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const requestedPermission = useRef(false);
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"present" | "late" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  // Request camera access and keep the loading state visible while the OS
  // prompt is on screen, so our own sheet never shows underneath it.
  const requestCameraAccess = useCallback(() => {
    setRequesting(true);
    requestPermission()
      .then(() => setRequesting(false))
      .catch(() => setRequesting(false));
  }, [requestPermission]);

  // Option B: trigger the native permission prompt automatically on first
  // open so the OS dialog is the single, canonical permission prompt. The
  // floating sheet below is only a fallback after denial or when blocked.
  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !requestedPermission.current
    ) {
      requestedPermission.current = true;
      requestCameraAccess();
    }
  }, [permission, requestCameraAccess]);

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

  // iOS-style "Don't Allow" / "Not Now": leave the scanner. Fall back to the
  // student home when there is no history (e.g. deep-linked into the scanner).
  const handleDismissPermission = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/student");
    }
  };

  // Camera permission gate. expo-camera's CameraView renders a black preview
  // when the CAMERA permission has not been granted, so we must request it
  // before mounting the camera.
  //
  // Option B: the OS prompt is triggered automatically on first open, so the
  // native dialog is the single permission prompt. The floating iOS-style
  // sheet is only a fallback shown after a denial or when access is blocked.
  if (!permission?.granted) {
    const awaitingNativePrompt =
      !permission ||
      requesting ||
      (permission.canAskAgain && !requestedPermission.current);

    return (
      <View style={styles.permissionScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" />
        {awaitingNativePrompt ? (
          <Text style={styles.msgText}>Preparing camera…</Text>
        ) : (
          <Modal
            transparent
            visible
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleDismissPermission}
          >
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Camera Access Needed</Text>
                  <Text style={styles.sheetMessage}>
                    {permission?.canAskAgain
                      ? "Camera access is required to scan attendance QR codes."
                      : "Camera access is blocked. Enable it in Settings to scan QR codes."}
                  </Text>
                </View>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.sheetAction}
                  activeOpacity={0.5}
                  onPress={handleDismissPermission}
                >
                  <Text style={styles.sheetActionText}>Not Now</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.sheetAction}
                  activeOpacity={0.5}
                  onPress={
                    permission?.canAskAgain
                      ? requestCameraAccess
                      : () => Linking.openSettings()
                  }
                >
                  <Text
                    style={[styles.sheetActionText, styles.sheetActionPrimary]}
                  >
                    {permission?.canAskAgain ? "Allow" : "Open Settings"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  }

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
                  <Text style={styles.resultLabel}>{"\u26A0\uFE0F Error"}</Text>
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
                      ? "\uD83D\uDD52 Marked Late"
                      : "\u2705 Attendance Recorded"}
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  sheet: {
    width: 270,
    maxWidth: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    gap: 6,
  },
  sheetTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  sheetMessage: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#3A3A3C",
  },
  sheetAction: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetActionText: {
    color: "#0A84FF",
    fontSize: 17,
    fontWeight: "400",
  },
  sheetActionPrimary: {
    fontWeight: "600",
  },
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
