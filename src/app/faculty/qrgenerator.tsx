import * as Crypto from "expo-crypto";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { getDB, markSynced, saveSession } from "../../../lib/db";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../stores/authStore";

const { width } = Dimensions.get("window");
const QR_INTERVAL = 15;

async function saveSessionToLocal(session: SessionPayload) {
  await saveSession({
    id: session.id,
    subject: session.subject,
    room: session.room,
    faculty_id: session.facultyId,
    token: session.token,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    role: session.role,
    late_threshold_minutes: session.lateThresholdMinutes,
  });
  console.log("[SQLite] Save session locally:", session);
}

async function syncSessionToSupabase(session: SessionPayload) {
  const { error } = await supabase.from("sessions").upsert({
    id: session.id,
    subject: session.subject,
    subject_id: session.subjectId,
    room: session.room,
    room_id: session.roomId,
    faculty_id: session.facultyId,
    token: session.token,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    role: session.role,
    late_threshold_minutes: session.lateThresholdMinutes,
  });
  if (error) throw error;
  await markSynced("sessions", session.id);
  console.log("[Supabase] Sync session online:", session);
}

async function logTokenRotation(sessionId: string, newToken: string) {
  const db = await getDB();
  const rotationId = `rot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  await db.runAsync(
    `INSERT INTO token_rotations (id, session_id, token, rotated_at, synced) VALUES (?,?,?,?,0)`,
    [rotationId, sessionId, newToken, new Date().toISOString()],
  );

  try {
    const { error } = await supabase.from("token_rotations").insert({
      id: rotationId,
      session_id: sessionId,
      token: newToken,
      rotated_at: new Date().toISOString(),
    });
    if (error) throw error;
    await markSynced("token_rotations", rotationId);
  } catch (err) {
    console.log("[TokenRotation] Queued for later sync:", err);
  }
}

type SessionPayload = {
  id: string;
  subject: string;
  subjectId: string | null;
  room: string;
  roomId: string | null;
  facultyId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  role: "faculty";
  signature: string;
  lateThresholdMinutes: number;
};

const SECRET = process.env.EXPO_PUBLIC_QR_SECRET;

function generateToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

function buildQRPayload(session: SessionPayload): string {
  return JSON.stringify(session);
}

async function signPayload(
  sessionId: string,
  token: string,
  expiresAt: string,
): Promise<string> {
  const data = `${sessionId}:${token}:${expiresAt}:${SECRET}`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data,
  );
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const progress = seconds / total;
  const size = 120;
  const strokeWidth = 6;
  const color = seconds > 20 ? "#C8F04D" : seconds > 10 ? "#F2C14E" : "#F2816B";

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: "rgba(255,255,255,0.08)",
          position: "absolute",
        }}
      />
      <View
        style={{
          width: size - strokeWidth * 2,
          height: size - strokeWidth * 2,
          borderRadius: (size - strokeWidth * 2) / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: progress > 0.75 ? color : "transparent",
          borderRightColor: progress > 0.5 ? color : "transparent",
          borderBottomColor: progress > 0.25 ? color : "transparent",
          borderLeftColor: color,
          position: "absolute",
          transform: [{ rotate: "-90deg" }],
        }}
      />
      <Text style={{ color, fontSize: 28, fontWeight: "800" }}>{seconds}</Text>
      <Text
        style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 2 }}
      >
        sec
      </Text>
    </View>
  );
}

export default function QRGenerator() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [duration, setDuration] = useState("60");
  const [isActive, setIsActive] = useState(false);
  const [sessionId] = useState(generateSessionId());
  const [lateThreshold, setLateThreshold] = useState(10);
  const [token, setToken] = useState(generateToken());
  const [countdown, setCountdown] = useState(QR_INTERVAL);
  const [sessionRemaining, setSessionRemaining] = useState(0);
  const [qrPayload, setQrPayload] = useState("");
  const [rotationCount, setRotationCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "offline"
  >("idle");

  const qrFadeAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const selectedSubjectName =
    subjects.find((s) => s.id === selectedSubjectId)?.name ?? "";
  const selectedRoomName =
    rooms.find((r) => r.id === selectedRoomId)?.name ?? "";

  useEffect(() => {
    supabase
      .from("subjects")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setSubjects(data);
      });

    supabase
      .from("rooms")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setRooms(data);
      });
  }, []);

  const buildSession = async (
    t: string,
  ): Promise<SessionPayload & { schoolId: string | null }> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const currentSchoolId = useAuthStore.getState().schoolId;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + parseInt(duration) * 60 * 1000,
    ).toISOString();
    const signature = await signPayload(sessionId, t, expiresAt);

    return {
      id: sessionId,
      subject: selectedSubjectName,
      subjectId: selectedSubjectId,
      room: selectedRoomName,
      roomId: selectedRoomId,
      facultyId: user?.id ?? "unknown",
      token: t,
      createdAt,
      expiresAt,
      role: "faculty",
      signature,
      lateThresholdMinutes: lateThreshold,
      schoolId: currentSchoolId,
    };
  };

  const rotateToken = async () => {
    Animated.timing(qrFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(async () => {
      const newToken = generateToken();
      setToken(newToken);
      setCountdown(QR_INTERVAL);
      setRotationCount((c) => c + 1);

      const session = await buildSession(newToken);
      setQrPayload(buildQRPayload(session));

      Animated.timing(qrFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      try {
        await logTokenRotation(sessionId, newToken);
      } catch (err) {
        console.log("[TokenRotation] Failed silently, not blocking UI:", err);
      }
    });
  };

  const startSession = async () => {
    if (!selectedSubjectId || !selectedRoomId || !duration.trim()) return;

    const mins = parseInt(duration);
    if (isNaN(mins) || mins <= 0) return;

    const initialToken = generateToken();
    setToken(initialToken);
    setCountdown(QR_INTERVAL);
    setSessionRemaining(mins * 60);
    setIsActive(true);
    setRotationCount(0);

    const session = await buildSession(initialToken);
    setQrPayload(buildQRPayload(session));

    setSyncStatus("syncing");
    await saveSessionToLocal(session);

    try {
      await syncSessionToSupabase(session);
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setQrPayload("");
    setCountdown(QR_INTERVAL);
    setSessionRemaining(0);
    setSyncStatus("idle");
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
  };

  useEffect(() => {
    if (!isActive) return;
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          rotateToken();
          return QR_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    sessionIntervalRef.current = setInterval(() => {
      setSessionRemaining((prev) => {
        if (prev <= 1) {
          stopSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
    };
  }, [isActive]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const syncColor =
    syncStatus === "synced"
      ? "#C8F04D"
      : syncStatus === "syncing"
        ? "#F2C14E"
        : syncStatus === "offline"
          ? "#F2816B"
          : "rgba(255,255,255,0.2)";

  const syncLabel =
    syncStatus === "synced"
      ? "● Synced to Database"
      : syncStatus === "syncing"
        ? "○ Syncing..."
        : syncStatus === "offline"
          ? "● Offline — queued"
          : "○ Not started";

  const canStart = !!selectedSubjectId && !!selectedRoomId && !!duration.trim();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>QR Generator</Text>
        </View>

        <View style={[styles.syncPill, { borderColor: syncColor + "55" }]}>
          <Text style={[styles.syncText, { color: syncColor }]}>
            {syncLabel}
          </Text>
        </View>

        {!isActive ? (
          <View style={styles.form}>
            <View style={styles.subjectHeaderRow}>
              <Text style={styles.label}>Subject</Text>
              <TouchableOpacity
                onPress={() => router.push("/faculty/subjects")}
              >
                <Text style={styles.manageLink}>Manage Subjects</Text>
              </TouchableOpacity>
            </View>

            {subjects.length === 0 ? (
              <TouchableOpacity
                style={styles.noSubjectsCard}
                onPress={() => router.push("/faculty/subjects")}
              >
                <Text style={styles.noSubjectsText}>
                  No subjects yet — tap to add one
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.subjectChipRow}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.subjectChip,
                      selectedSubjectId === s.id && styles.subjectChipActive,
                    ]}
                    onPress={() => setSelectedSubjectId(s.id)}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        selectedSubjectId === s.id &&
                          styles.subjectChipTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.subjectHeaderRow}>
              <Text style={styles.label}>Room</Text>
              <TouchableOpacity onPress={() => router.push("/faculty/rooms")}>
                <Text style={styles.manageLink}>Manage Rooms</Text>
              </TouchableOpacity>
            </View>

            {rooms.length === 0 ? (
              <TouchableOpacity
                style={styles.noSubjectsCard}
                onPress={() => router.push("/faculty/rooms")}
              >
                <Text style={styles.noSubjectsText}>
                  No rooms yet — tap to add one
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.subjectChipRow}>
                {rooms.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.subjectChip,
                      selectedRoomId === r.id && styles.subjectChipActive,
                    ]}
                    onPress={() => setSelectedRoomId(r.id)}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        selectedRoomId === r.id && styles.subjectChipTextActive,
                      ]}
                    >
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Session Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 60"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Late Threshold</Text>
            <View style={styles.lateCard}>
              <View style={styles.lateCardHeader}>
                <Text style={styles.lateCardTitle}>
                  Mark students late after
                </Text>
                <Text style={styles.lateCardValue}>{lateThreshold} min</Text>
              </View>

              <View style={styles.chipRow}>
                {[5, 10, 15, 20].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[
                      styles.chip,
                      lateThreshold === mins && styles.chipActive,
                    ]}
                    onPress={() => setLateThreshold(mins)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        lateThreshold === mins && styles.chipTextActive,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.lateCardHint}>
                Students scanning after this window will be marked late instead
                of present.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
              onPress={startSession}
              disabled={!canStart}
            >
              <Text style={styles.startBtnText}>Start Session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeSession}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionSubject}>{selectedSubjectName}</Text>
              <Text style={styles.sessionRoom}>{selectedRoomName}</Text>
              <View style={styles.sessionMeta}>
                <Text style={styles.sessionMetaText}>Session ends in</Text>
                <Text style={styles.sessionTimer}>
                  {formatTime(sessionRemaining)}
                </Text>
              </View>
            </View>

            <Animated.View style={[styles.qrCard, { opacity: qrFadeAnim }]}>
              <View style={styles.qrInner}>
                {qrPayload ? (
                  <QRCode
                    value={qrPayload}
                    size={width * 0.58}
                    color="#0D0D0D"
                    backgroundColor="#FFFFFF"
                  />
                ) : null}
              </View>
              <Text style={styles.qrHint}>
                Students scan this QR to mark attendance
              </Text>
            </Animated.View>

            <View style={styles.countdownRow}>
              <CountdownRing seconds={countdown} total={QR_INTERVAL} />
              <View style={styles.countdownInfo}>
                <Text style={styles.countdownLabel}>QR refreshes in</Text>
                <Text style={styles.rotationCount}>
                  Rotated {rotationCount}×
                </Text>
                <Text style={styles.tokenText}>Token: {token}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.stopBtn} onPress={stopSession}>
              <Text style={styles.stopBtnText}>End Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  header: { paddingTop: 32, paddingBottom: 16, gap: 4 },
  headerTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
  },
  headerSub: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  syncPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 24,
  },
  syncText: { fontSize: 12, fontWeight: "600" },
  form: { gap: 8 },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 8,
    textTransform: "uppercase",
  },
  subjectHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  manageLink: {
    color: "#C8F04D",
    fontSize: 12,
    fontWeight: "700",
  },
  noSubjectsCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  noSubjectsText: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  subjectChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  subjectChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  subjectChipActive: {
    backgroundColor: "rgba(200,240,77,0.14)",
    borderColor: "#C8F04D",
  },
  subjectChipText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "700",
  },
  subjectChipTextActive: { color: "#C8F04D" },
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
  startBtn: {
    backgroundColor: "#C8F04D",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  startBtnDisabled: { opacity: 0.35 },
  startBtnText: { color: "#0D0D0D", fontSize: 16, fontWeight: "800" },
  lateCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 18,
    gap: 14,
    marginTop: 8,
  },
  lateCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lateCardTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  lateCardValue: { color: "#C8F04D", fontSize: 16, fontWeight: "800" },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "rgba(200,240,77,0.14)",
    borderColor: "#C8F04D",
  },
  chipText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: "#C8F04D" },
  lateCardHint: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    lineHeight: 15,
  },
  activeSession: { gap: 24, alignItems: "center" },
  sessionInfo: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    padding: 18,
    gap: 4,
  },
  sessionSubject: { color: "#fff", fontSize: 18, fontWeight: "700" },
  sessionRoom: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  sessionMetaText: { color: "rgba(255,255,255,0.35)", fontSize: 13 },
  sessionTimer: {
    color: "#C8F04D",
    fontSize: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  qrCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 14,
    shadowColor: "#C8F04D",
    shadowOpacity: 0.15,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  qrInner: { borderRadius: 8, overflow: "hidden" },
  qrHint: { color: "rgba(0,0,0,0.4)", fontSize: 12, textAlign: "center" },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  countdownInfo: { flex: 1, gap: 4 },
  countdownLabel: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  rotationCount: { color: "#fff", fontSize: 18, fontWeight: "700" },
  tokenText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    fontFamily: "monospace",
  },
  stopBtn: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(242,129,107,0.4)",
    paddingVertical: 14,
    alignItems: "center",
  },
  stopBtnText: { color: "#F2816B", fontSize: 15, fontWeight: "700" },
});
