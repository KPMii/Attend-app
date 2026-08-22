import * as Crypto from "expo-crypto";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
import { useAuthStore } from "../../../stores/authStore";
import { LazyQRCode } from "../../components/lazyQRCode";
import { logAction } from "../../lib/audit";
import { getDB, markSynced, saveSession } from "../../lib/db";
import { supabase } from "../../lib/supabase";

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
    section_id: session.sectionId,
    faculty_id: session.facultyId,
    token: session.token,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    role: session.role,
    late_threshold_minutes: session.lateThresholdMinutes,
    session_type: session.sessionType,
    event_name: session.eventName,
    school_id: session.schoolId,
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

type SessionType = "class" | "event";

type SessionPayload = {
  id: string;
  subject: string;
  subjectId: string | null;
  room: string;
  sectionId: string | null;
  schoolId: string | null;
  facultyId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  role: "faculty";
  signature: string;
  lateThresholdMinutes: number;
  sessionType: SessionType;
  eventName: string | null;
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
  const { resume } = useLocalSearchParams<{ resume?: string }>();
  const role = useAuthStore((s) => s.role);
  const isStudentCouncil = role === "student_council_officer";

  const [sessionType, setSessionType] = useState<SessionType>(
    isStudentCouncil ? "event" : "class",
  );
  const [eventName, setEventName] = useState("");

  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );
  const [sections, setSections] = useState<
    { id: string; name: string; room: string | null }[]
  >([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );

  const [selectDropDownSubjects, setSelectDropDownSubjects] = useState(false);
  const [selectDropDownSections, setSelectdropDownSections] = useState(false);

  const [eventRoom, setEventRoom] = useState("");
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
  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const selectedSectionName = selectedSection?.name ?? "";
  const selectedRoomName = selectedSection?.room ?? "";

  useEffect(() => {
    supabase
      .from("subjects")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setSubjects(data);
      });

    supabase
      .from("sections")
      .select("id, name, room")
      .order("name")
      .then(({ data }) => {
        if (data) setSections(data);
      });
  }, []);

  // Pre-fill from resumed session
  useEffect(() => {
    if (!resume) return;
    supabase
      .from("sessions")
      .select("subject, room, event_name, session_type, section_id")
      .eq("id", resume)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setSessionType((data.session_type as SessionType) || "event");
        if (data.session_type === "event") {
          setEventName(data.event_name || data.subject);
          setEventRoom(data.room);
          setSelectedSectionId(data.section_id || null);
        }
      });
  }, [resume]);

  const buildSession = async (t: string): Promise<SessionPayload> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user?.id)
      .single();
    const schoolId = profile?.school_id ?? null;

    const createdAt = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + parseInt(duration) * 60 * 1000,
    ).toISOString();
    const signature = await signPayload(sessionId, t, expiresAt);

    if (sessionType === "event") {
      return {
        id: sessionId,
        subject: eventName,
        subjectId: null,
        room: eventRoom,
        sectionId: selectedSectionId,
        facultyId: user?.id ?? "unknown",
        token: t,
        createdAt,
        expiresAt,
        role: "faculty",
        signature,
        lateThresholdMinutes: lateThreshold,
        sessionType: "event",
        eventName,
        schoolId,
      };
    }

    return {
      id: sessionId,
      subject: selectedSubjectName,
      subjectId: selectedSubjectId,
      room: selectedRoomName,
      sectionId: selectedSectionId,
      facultyId: user?.id ?? "unknown",
      token: t,
      createdAt,
      expiresAt,
      role: "faculty",
      signature,
      lateThresholdMinutes: lateThreshold,
      sessionType: "class",
      eventName: null,
      schoolId,
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
    if (sessionType === "class") {
      if (!selectedSubjectId || !selectedSectionId || !duration.trim()) return;
    } else {
      if (!eventName.trim() || !eventRoom.trim() || !duration.trim()) return;
    }

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
      logAction("session_created", {
        tableName: "sessions",
        recordId: session.id,
        description:
          sessionType === "event"
            ? `Started event: ${eventName}`
            : `Started ${selectedSubjectName} in ${selectedSectionName}`,
      });
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
          ? "● Offline queued"
          : "○ Not started";

  const canStart =
    sessionType === "class"
      ? !!selectedSubjectId && !!selectedSectionId && !!duration.trim()
      : !!eventName.trim() && !!eventRoom.trim() && !!duration.trim();

  const activeTitle = sessionType === "event" ? eventName : selectedSubjectName;
  const activeMeta =
    sessionType === "event"
      ? selectedSectionName
        ? `${eventRoom} · Section: ${selectedSectionName}`
        : eventRoom
      : `${selectedSectionName} · ${selectedRoomName}`;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Create Session</Text>
          <View style={[styles.syncPill, { borderColor: syncColor + "55" }]}>
            <Text style={[styles.syncText, { color: syncColor }]}>
              {syncLabel}
            </Text>
          </View>
        </View>

        <Text style={styles.InitialTitle}>Set up your session</Text>
        <Text style={styles.InitialSub}>
          Configure details before starting.
        </Text>

        {!isActive ? (
          <View style={styles.form}>
            <View style={styles.typeToggleRow}>
              {!isStudentCouncil && (
                <TouchableOpacity
                  style={[
                    styles.typeToggle,
                    sessionType === "class" && styles.typeToggleActive,
                  ]}
                  onPress={() => setSessionType("class")}
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      sessionType === "class" && styles.typeToggleTextActive,
                    ]}
                  >
                    Class
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.typeToggle,
                  sessionType === "event" && styles.typeToggleActive,
                ]}
                onPress={() => setSessionType("event")}
              >
                <Text
                  style={[
                    styles.typeToggleText,
                    sessionType === "event" && styles.typeToggleTextActive,
                  ]}
                >
                  Event
                </Text>
              </TouchableOpacity>
            </View>
            {sessionType === "class" ? (
              <>
                <View style={styles.subjectHeaderRow}>
                  <Text style={styles.label}>Subject</Text>
                </View>

                {subjects.length === 0 ? (
                  <Text style={styles.noSubjectsText}>No subjects yet...</Text>
                ) : (
                  <View style={styles.subjectChipRow}>
                    <TouchableOpacity
                      style={[
                        styles.selectBox,
                        selectDropDownSubjects && styles.selectBoxOpen,
                      ]}
                      onPress={() =>
                        setSelectDropDownSubjects(!selectDropDownSubjects)
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={
                          selectedSubjectId
                            ? styles.selectBoxText
                            : styles.selectBoxPlaceholder
                        }
                      >
                        {subjects.find((s) => s.id === selectedSubjectId)
                          ?.name ?? "Select Subject"}
                      </Text>
                      <Text style={styles.selectBoxCaret}>
                        {selectDropDownSubjects ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>

                    {selectDropDownSubjects && (
                      <View style={styles.subjectChipRow}>
                        {subjects.map((s) => (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => {
                              setSelectedSubjectId(s.id);
                              setSelectDropDownSubjects(false);
                            }}
                            style={[
                              styles.chip,
                              selectedSubjectId === s.id && styles.chipActive,
                            ]}
                          >
                            <Text style={styles.chipText}>{s.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.label}>Event Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Foundation Day"
                  placeholderTextColor="#777070"
                  value={eventName}
                  onChangeText={setEventName}
                />

                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Main Gymnasium"
                  placeholderTextColor="#777070"
                  value={eventRoom}
                  onChangeText={setEventRoom}
                />
              </>
            )}
            <View style={styles.subjectHeaderRow}>
              <Text style={styles.label}>
                Section
                {sessionType === "event" ? (
                  <Text style={styles.optionalLabel}> (optional)</Text>
                ) : null}
              </Text>
            </View>
            {sections.length === 0 ? (
              <Text style={styles.noSubjectsText}>No sections yet...</Text>
            ) : (
              <View style={styles.subjectChipRow}>
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    selectDropDownSections && styles.selectBoxOpen,
                  ]}
                  onPress={() =>
                    setSelectdropDownSections(!selectDropDownSections)
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={
                      selectedSectionId
                        ? styles.selectBoxText
                        : styles.selectBoxPlaceholder
                    }
                  >
                    {sections.find((s) => s.id === selectedSectionId)?.name ??
                      "Select sections"}
                  </Text>
                  <Text style={styles.selectBoxCaret}>
                    {selectDropDownSections ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>

                {selectDropDownSections && (
                  <View style={styles.subjectChipRow}>
                    {sections.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => {
                          setSelectedSectionId(s.id);
                          setSelectdropDownSections(false);
                        }}
                        style={[
                          styles.chip,
                          selectedSectionId === s.id && styles.chipActive,
                        ]}
                      >
                        <Text style={styles.chipText}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
            {sessionType === "class" && selectedSection && (
              <Text style={styles.roomHint}>
                Room: {selectedRoomName || "—"}
              </Text>
            )}
            <Text>Session Settings</Text>
            <View style={styles.sessionSettings}>
              <Text style={styles.label}> Duration</Text>
              <TextInput
                style={styles.inputDuration}
                placeholder="30 minutes"
                placeholderTextColor="#706c6c"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />

              <View style={styles.lateCard}>
                <View style={styles.lateCardHeader}>
                  <Text style={styles.label}>Late Threshold</Text>
                  <Text style={styles.lateCardTitle}>
                    Mark students late after
                  </Text>
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
                      <Text style={styles.chipText}>{mins}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
              <Text style={styles.sessionSubject}>{activeTitle}</Text>
              <Text style={styles.sessionRoom}>{activeMeta}</Text>
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
                  <LazyQRCode
                    value={qrPayload}
                    size={width * 0.58}
                    color="#0D0D0D"
                    backgroundColor={White}
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

const Black = "#000";
const Gray = "#6B7280";
const White = "#ffffff";
const BackgroundColor = "#F0F3FF";
const Blue = "#305CDE";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BackgroundColor },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  header: { paddingTop: 32, paddingBottom: 8, gap: 4 },
  headerTitle: {
    color: Black,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: -1,
  },
  headerSub: { color: "rgba(255,255,255,0.4)", fontSize: 14 },
  InitialTitle: {
    color: Black,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -1,
  },
  InitialSub: {
    color: Gray,
    fontSize: 14,
    fontWeight: "medium",
    letterSpacing: -1,
    paddingBottom: 32,
  },
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
  typeToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F0F3FF",
    borderRadius: 16,
    padding: 4,
    marginBottom: 8,
  },
  typeToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: "center",
  },
  typeToggleActive: { backgroundColor: Blue },
  typeToggleText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
  },
  typeToggleTextActive: { color: White },
  label: {
    color: Black,
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
  manageLink: { color: White, fontSize: 12, fontWeight: "700" },
  noSubjectsCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  noSubjectsText: { color: Black, fontSize: 13 },
  subjectChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: White,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 120,
    paddingVertical: 9,
    marginTop: 6,
  },
  selectBoxOpen: { borderColor: Blue },
  selectBoxText: { color: Black, fontSize: 15, fontWeight: "600" },
  selectBoxPlaceholder: { color: Gray, fontSize: 15, fontWeight: "600" },
  selectBoxCaret: { color: Gray, fontSize: 12 },
  roomHint: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  optionalLabel: { color: "rgba(255,255,255,0.3)", fontSize: 12 },
  eventHint: {
    color: Black,
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: White,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    color: Black,
    fontSize: 15,
  },
  inputDuration: {
    backgroundColor: BackgroundColor,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    color: Black,
    fontSize: 15,
  },
  startBtn: {
    backgroundColor: Blue,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  startBtnDisabled: { opacity: 0.35 },
  startBtnText: { color: White, fontSize: 16, fontWeight: "800" },
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
    textAlignVertical: "auto",
    alignItems: "center",
  },
  lateCardTitle: {
    color: Black,
    fontSize: 13,
    fontWeight: "600",
  },
  lateCardValue: { color: Black, fontSize: 16, fontWeight: "800" },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: White,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: BackgroundColor,
    borderColor: Blue,
  },
  chipText: {
    color: Black,
    fontSize: 13,
    fontWeight: "700",
  },
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
  sessionSubject: { color: "#000", fontSize: 18, fontWeight: "700" },
  sessionRoom: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
  sessionSettings: {
    backgroundColor: White,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginTop: 8,
    flex: 1,
  },
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
    backgroundColor: "#000",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 14,
    shadowColor: "#fff",
    shadowOpacity: 0.15,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  qrInner: { borderRadius: 8, overflow: "hidden" },
  qrHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
  },
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
