import * as Print from "expo-print";
import { useEffect, useState } from "react";
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
import { useAuthStore } from "../../../../stores/authStore";
import { logAction } from "../../../lib/audit";
import {
  buildRangeCsv,
  buildSingleCsv,
  shareCsv,
} from "../../../lib/csvExport";
import { sharePdf } from "../../../lib/pdfShare";
import { supabase } from "../../../lib/supabase";

type Section = { id: string; name: string };
type SessionRow = {
  id: string;
  subject: string;
  created_at: string;
  expires_at?: string | null;
  session_type?: string;
  event_name?: string | null;
  faculty_id?: string | null;
};
type ExportFormat = "pdf" | "csv";

export default function Reports() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const role = useAuthStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);

  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [ownSessions, setOwnSessions] = useState<SessionRow[]>([]);

  const [reportMode, setReportMode] = useState<"range" | "single">("range");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sections for faculty/class reports
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // If faculty has assigned sections, only show those.
      const [{ data: allSections }, { data: assignments }] = await Promise.all([
        supabase.from("sections").select("id, name").order("name"),
        supabase
          .from("faculty_assignments")
          .select("section_id")
          .eq("faculty_id", user.id),
      ]);

      let filtered = allSections ?? [];
      if (assignments && assignments.length > 0) {
        const assignedIds = new Set(assignments.map((a) => a.section_id));
        filtered = filtered.filter((s) => assignedIds.has(s.id));
      }
      setSections(filtered);
    })();
  }, []);

  // Fetch own sessions for student council (event sessions without sections)
  useEffect(() => {
    if (role === "student_council_officer" && userId) {
      supabase
        .from("sessions")
        .select("id, subject, created_at, session_type, event_name")
        .eq("faculty_id", userId)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) setOwnSessions(data);
        });
    }
  }, [role, userId]);

  useEffect(() => {
    if (!selectedSectionId || reportMode !== "single") return;
    loadSessions();
  }, [selectedSectionId, reportMode]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select(
        "id, subject, created_at, expires_at, session_type, event_name, faculty_id",
      )
      .eq("section_id", selectedSectionId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSessions(data);
    setSelectedSessionId(null);
  };

  // Fetch shared data for both PDF and CSV exports
  const fetchReportData = async () => {
    if (!selectedSectionId) {
      setError("Please select a section");
      return null;
    }
    if (reportMode === "single" && !selectedSessionId) {
      setError("Please select a session");
      return null;
    }

    const sectionName =
      sections.find((s) => s.id === selectedSectionId)?.name ??
      "Unknown Section";

    if (reportMode === "single") {
      const session = sessions.find((s) => s.id === selectedSessionId);
      const { data: roster } = await supabase.rpc("get_section_roster", {
        p_section_id: selectedSectionId,
      });
      const { data: attendance } = await supabase
        .from("attendance")
        .select("student_id, status, scanned_at")
        .eq("session_id", selectedSessionId);

      const attendanceMap = new Map(
        (attendance ?? []).map((a) => [
          a.student_id,
          { status: a.status, scannedAt: a.scanned_at },
        ]),
      );
      const rows = (roster ?? [])
        .map((student: any) => ({
          name: student.full_name,
          schoolId: student.school_id_no,
          status: attendanceMap.get(student.student_id)?.status ?? "absent",
          scannedAt: attendanceMap.get(student.student_id)?.scannedAt ?? null,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      // Get faculty name for the report header
      let facultyName = "Unknown Faculty";
      if (session?.faculty_id) {
        const { data: faculty } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.faculty_id)
          .single();
        facultyName = faculty?.full_name ?? facultyName;
      }

      return {
        type: "single" as const,
        sectionName,
        subject: session?.subject ?? "Unknown Subject",
        sessionDate: session?.created_at ?? "",
        sessionEndsAt: session?.expires_at ?? null,
        facultyName,
        rows,
      };
    }

    // Range report
    const { data: roster } = await supabase.rpc("get_section_roster", {
      p_section_id: selectedSectionId,
    });
    const { data: rangeSessions } = await supabase
      .from("sessions")
      .select("id, subject, created_at")
      .eq("section_id", selectedSectionId)
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`)
      .order("created_at");

    const sessionIds = (rangeSessions ?? []).map((s) => s.id);
    const { data: attendance } =
      sessionIds.length > 0
        ? await supabase
            .from("attendance")
            .select("student_id, session_id, status")
            .in("session_id", sessionIds)
        : { data: [] };

    const attendanceMap = new Map<string, Map<string, string>>();
    (attendance ?? []).forEach((a) => {
      if (!attendanceMap.has(a.student_id))
        attendanceMap.set(a.student_id, new Map());
      attendanceMap.get(a.student_id)!.set(a.session_id, a.status);
    });

    const summaryRows = (roster ?? []).map((student: any) => {
      const studentAttendance =
        attendanceMap.get(student.student_id) ?? new Map();
      let present = 0,
        late = 0,
        absent = 0;
      (rangeSessions ?? []).forEach((s) => {
        const status = studentAttendance.get(s.id);
        if (status === "present") present++;
        else if (status === "late") late++;
        else absent++;
      });
      return {
        name: student.full_name,
        schoolId: student.school_id_no,
        present,
        late,
        absent,
        total: (rangeSessions ?? []).length,
      };
    });

    return {
      type: "range" as const,
      sectionName,
      startDate,
      endDate,
      totalSessions: (rangeSessions ?? []).length,
      rows: summaryRows,
    };
  };

  const generateReport = async () => {
    setError(null);
    setGenerating(true);

    try {
      const data = await fetchReportData();
      if (!data) {
        setGenerating(false);
        return;
      }

      if (exportFormat === "csv") {
        const csv =
          data.type === "single"
            ? buildSingleCsv(data.rows)
            : buildRangeCsv(data.rows);
        const filename = `attendance_${data.sectionName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}`;
        await shareCsv(csv, filename);
      } else {
        const html =
          data.type === "single"
            ? buildSingleSessionHtml({
                sectionName: data.sectionName,
                subject: data.subject,
                sessionDate: data.sessionDate,
                sessionEndsAt: data.sessionEndsAt,
                facultyName: data.facultyName,
                rows: data.rows,
              })
            : buildRangeReportHtml({
                sectionName: data.sectionName,
                startDate: data.startDate,
                endDate: data.endDate,
                totalSessions: data.totalSessions,
                rows: data.rows,
              });
        const { uri } = await Print.printToFileAsync({ html });
        await sharePdf(
          uri,
          `attendance_${data.sectionName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}`,
        );
      }

      logAction("session_created", {
        description:
          reportMode === "single"
            ? `Generated ${exportFormat.toUpperCase()} single-session report`
            : `Generated ${exportFormat.toUpperCase()} range report (${startDate} to ${endDate})`,
      });
    } catch (err) {
      console.error("Report generation error:", err);
      setError("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  // For student council: show own event sessions instead of section picker
  const showSectionPicker = role !== "student_council_officer";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Attendance Reports</Text>

        <View style={styles.typeToggleRow}>
          <TouchableOpacity
            style={[
              styles.typeToggle,
              reportMode === "range" && styles.typeToggleActive,
            ]}
            onPress={() => setReportMode("range")}
          >
            <Text
              style={[
                styles.typeToggleText,
                reportMode === "range" && styles.typeToggleTextActive,
              ]}
            >
              Date Range Summary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeToggle,
              reportMode === "single" && styles.typeToggleActive,
            ]}
            onPress={() => setReportMode("single")}
          >
            <Text
              style={[
                styles.typeToggleText,
                reportMode === "single" && styles.typeToggleTextActive,
              ]}
            >
              Single Session
            </Text>
          </TouchableOpacity>
        </View>

        {showSectionPicker ? (
          <>
            <Text style={styles.label}>Section</Text>
            <View style={styles.chipRow}>
              {sections.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.chip,
                    selectedSectionId === s.id && styles.chipActive,
                  ]}
                  onPress={() => setSelectedSectionId(s.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedSectionId === s.id && styles.chipTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>My Event Sessions</Text>
            {ownSessions.length === 0 ? (
              <Text style={styles.hint}>
                No event sessions yet. Create one from the QR Generator.
              </Text>
            ) : (
              <View style={styles.sessionList}>
                {ownSessions.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.sessionRow,
                      selectedSessionId === s.id && styles.sessionRowActive,
                    ]}
                    onPress={() => {
                      setSelectedSessionId(s.id);
                      // Auto-switch to single session mode when selecting from own sessions
                      setReportMode("single");
                    }}
                  >
                    <Text style={styles.sessionSubject}>
                      {s.event_name || s.subject}
                    </Text>
                    <Text style={styles.sessionDate}>
                      {new Date(s.created_at).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {reportMode === "range" && showSectionPicker && (
          <>
            <Text style={styles.label}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,255,255,0.25)"
            />

            <Text style={styles.label}>End Date</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(255,255,255,0.25)"
            />
          </>
        )}

        {reportMode === "single" &&
          showSectionPicker &&
          (!selectedSectionId ? (
            <Text style={styles.hint}>Select a section first</Text>
          ) : sessions.length === 0 ? (
            <Text style={styles.hint}>No sessions found for this section</Text>
          ) : (
            <View style={styles.sessionList}>
              {sessions.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.sessionRow,
                    selectedSessionId === s.id && styles.sessionRowActive,
                  ]}
                  onPress={() => setSelectedSessionId(s.id)}
                >
                  <Text style={styles.sessionSubject}>{s.subject}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(s.created_at).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

        <Text style={styles.label}>Export Format</Text>
        <View style={styles.formatToggleRow}>
          <TouchableOpacity
            style={[
              styles.formatToggle,
              exportFormat === "pdf" && styles.formatToggleActive,
            ]}
            onPress={() => setExportFormat("pdf")}
          >
            <Text
              style={[
                styles.formatToggleText,
                exportFormat === "pdf" && styles.formatToggleTextActive,
              ]}
            >
              PDF
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.formatToggle,
              exportFormat === "csv" && styles.formatToggleActive,
            ]}
            onPress={() => setExportFormat("csv")}
          >
            <Text
              style={[
                styles.formatToggleText,
                exportFormat === "csv" && styles.formatToggleTextActive,
              ]}
            >
              Excel (CSV)
            </Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
          onPress={generateReport}
          disabled={generating}
        >
          <Text style={styles.generateBtnText}>
            {generating
              ? "Generating..."
              : `Generate ${exportFormat === "pdf" ? "PDF" : "CSV"} Report`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildRangeReportHtml({
  sectionName,
  startDate,
  endDate,
  totalSessions,
  rows,
}: {
  sectionName: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  rows: {
    name: string;
    schoolId: string;
    present: number;
    late: number;
    absent: number;
    total: number;
  }[];
}) {
  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td>${r.name}</td>
      <td>${r.schoolId}</td>
      <td style="text-align:center; color:#2e7d32;">${r.present}</td>
      <td style="text-align:center; color:#e65100;">${r.late}</td>
      <td style="text-align:center; color:#c62828;">${r.absent}</td>
      <td style="text-align:center; font-weight:bold;">${
        r.total > 0 ? Math.round(((r.present + r.late) / r.total) * 100) : 0
      }%</td>
    </tr>`,
    )
    .join("");

  return `
    <html>
      <head><meta charset="utf-8" /><style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 32px; color: #222; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; background: #f5f5f5; padding: 8px; font-size: 12px; text-transform: uppercase; color: #666; }
        td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
      </style></head>
      <body>
        <h1>Attendance Report — ${sectionName}</h1>
        <div class="meta">Period: ${startDate} to ${endDate} · ${totalSessions} session(s) total</div>
        <table>
          <thead><tr>
            <th>Student</th><th>School ID</th>
            <th style="text-align:center;">Present</th>
            <th style="text-align:center;">Late</th>
            <th style="text-align:center;">Absent</th>
            <th style="text-align:center;">Attendance %</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

function buildSingleSessionHtml({
  sectionName,
  subject,
  sessionDate,
  sessionEndsAt,
  facultyName,
  rows,
}: {
  sectionName: string;
  subject: string;
  sessionDate: string;
  sessionEndsAt?: string | null;
  facultyName?: string;
  rows: {
    name: string;
    schoolId: string;
    status: string;
    scannedAt: string | null;
  }[];
}) {
  const statusColor: Record<string, string> = {
    present: "#2e7d32",
    late: "#e65100",
    absent: "#c62828",
  };

  const presentCount = rows.filter((r) => r.status === "present").length;
  const lateCount = rows.filter((r) => r.status === "late").length;
  const absentCount = rows.filter((r) => r.status === "absent").length;
  const totalCount = rows.length;

  const startDate = new Date(sessionDate);
  const endDate = sessionEndsAt ? new Date(sessionEndsAt) : null;

  const dateStr = startDate.toLocaleDateString();
  const startTimeStr = startDate.toLocaleTimeString();
  const endTimeStr = endDate ? endDate.toLocaleTimeString() : "—";
  const durationStr = endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / 60000) + " min"
    : "—";

  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td>${r.name}</td>
      <td>${r.schoolId}</td>
      <td style="text-align:center; color:${statusColor[r.status]}; font-weight:bold; text-transform:capitalize;">
        ${r.status}
      </td>
      <td style="text-align:center; color:#666;">
        ${r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString() : "—"}
      </td>
    </tr>`,
    )
    .join("");

  return `
    <html>
      <head><meta charset="utf-8" /><style>
        body { font-family: Helvetica, Arial, sans-serif; padding: 32px; color: #222; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        .meta-grid { display: flex; gap: 32px; margin-bottom: 16px; }
        .meta-col { }
        .meta-label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-value { font-size: 13px; color: #444; font-weight: 600; margin-top: 2px; }
        .summary { display: flex; gap: 24px; margin-bottom: 24px; }
        .summary-box { text-align: center; background: #f7f7f7; border-radius: 8px; padding: 12px 18px; }
        .summary-num { font-size: 22px; font-weight: bold; }
        .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; background: #f5f5f5; padding: 8px; font-size: 12px; text-transform: uppercase; color: #666; }
        td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
      </style></head>
      <body>
        <h1>${subject} — ${sectionName}</h1>
        <div class="meta">Attendance Report · ${dateStr}</div>

        <div class="meta-grid">
          <div class="meta-col">
            <div class="meta-label">Date</div>
            <div class="meta-value">${dateStr}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Start Time</div>
            <div class="meta-value">${startTimeStr}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">End Time</div>
            <div class="meta-value">${endTimeStr}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Duration</div>
            <div class="meta-value">${durationStr}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Faculty</div>
            <div class="meta-value">${facultyName ?? "—"}</div>
          </div>
        </div>

        <div class="summary">
          <div class="summary-box" style="background:#e8f5e9;"><div class="summary-num" style="color:#2e7d32;">${presentCount}</div><div class="summary-label">Present</div></div>
          <div class="summary-box" style="background:#fff3e0;"><div class="summary-num" style="color:#e65100;">${lateCount}</div><div class="summary-label">Late</div></div>
          <div class="summary-box" style="background:#ffebee;"><div class="summary-num" style="color:#c62828;">${absentCount}</div><div class="summary-label">Absent</div></div>
          <div class="summary-box"><div class="summary-num" style="color:#555;">${totalCount}</div><div class="summary-label">Total</div></div>
        </div>

        <table>
          <thead><tr>
            <th>Student</th><th>School ID</th>
            <th style="text-align:center;">Status</th>
            <th style="text-align:center;">Time Scanned</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, gap: 8, paddingBottom: 48 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  typeToggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
  },
  typeToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  typeToggleActive: { backgroundColor: "#C8F04D" },
  typeToggleText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "700",
  },
  typeToggleTextActive: { color: "#0D0D0D" },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    textTransform: "uppercase",
  },
  hint: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipActive: {
    backgroundColor: "rgba(200,240,77,0.14)",
    borderColor: "#C8F04D",
  },
  chipText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: "#C8F04D" },
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
  sessionList: { gap: 6 },
  sessionRow: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sessionRowActive: {
    borderColor: "#C8F04D",
    backgroundColor: "rgba(200,240,77,0.08)",
  },
  sessionSubject: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sessionDate: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  errorText: { color: "#F2816B", fontSize: 13, marginTop: 12 },
  generateBtn: {
    backgroundColor: "#C8F04D",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: "#0D0D0D", fontSize: 16, fontWeight: "800" },
  formatToggleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 4,
    marginBottom: 8,
  },
  formatToggle: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  formatToggleActive: { backgroundColor: "#C8F04D" },
  formatToggleText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "700",
  },
  formatToggleTextActive: { color: "#0D0D0D" },
});
