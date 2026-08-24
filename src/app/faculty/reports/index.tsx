import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../../../../stores/authStore";
import { logAction } from "../../../lib/audit";
import { buildSingleCsv, shareCsv } from "../../../lib/csvExport";
import { supabase } from "../../../lib/supabase";

type Section = { id: string; name: string };
type SessionRow = {
  id: string;
  subject: string;
  created_at: string;
  session_type?: string;
  event_name?: string | null;
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

  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sections for faculty/class reports
  useEffect(() => {
    supabase
      .from("sections")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setSections(data);
      });
  }, []);

  // Fetch own sessions for student council (event sessions without sections)
  useEffect(() => {
    if (role === "student_council_officer" && userId) {
      supabase
        .from("sessions")
        .select("id, subject, created_at, session_type, event_name")
        .eq("faculty_id", userId)
        .eq("session_type", "event")
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) setOwnSessions(data);
        });
    }
  }, [role, userId]);

  useEffect(() => {
    if (!selectedSectionId) return;
    loadSessions();
  }, [selectedSectionId]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id, subject, created_at, session_type, event_name")
      .eq("section_id", selectedSectionId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSessions(data);
    setSelectedSessionId(null);
  };

  // Fetch shared data for both PDF and CSV exports
  const fetchReportData = async () => {
    // Student council officers generate reports for their own event sessions,
    // which have no section — so the section requirement must be skipped.
    const isEvent = role === "student_council_officer";

    if (!selectedSessionId) {
      setError(
        isEvent
          ? "Please select an event session"
          : "Please select a section and session",
      );
      return null;
    }

    if (!isEvent && !selectedSectionId) {
      setError("Please select a section");
      return null;
    }

    const session = isEvent
      ? ownSessions.find((s) => s.id === selectedSessionId)
      : sessions.find((s) => s.id === selectedSessionId);

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

    let sectionName = "";
    let rows: {
      name: string;
      schoolId: string;
      status: string;
      scannedAt: string | null;
    }[] = [];

    if (isEvent) {
      // Event session: no roster — only report the students who actually scanned.
      const studentIds = [...attendanceMap.keys()];
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, school_id_no")
          .in("id", studentIds);

        rows = (profiles ?? [])
          .map((p) => ({
            name: p.full_name ?? "Unknown",
            schoolId: p.school_id_no ?? "—",
            status: attendanceMap.get(p.id)?.status ?? "present",
            scannedAt: attendanceMap.get(p.id)?.scannedAt ?? null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      sectionName = "Event";
    } else {
      sectionName =
        sections.find((s) => s.id === selectedSectionId)?.name ??
        "Unknown Section";

      const { data: roster } = await supabase.rpc("get_section_roster", {
        p_section_id: selectedSectionId,
      });

      rows = (roster ?? [])
        .map((student: any) => ({
          name: student.full_name,
          schoolId: student.school_id_no,
          status: attendanceMap.get(student.student_id)?.status ?? "absent",
          scannedAt: attendanceMap.get(student.student_id)?.scannedAt ?? null,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    return {
      sectionName,
      subject: isEvent
        ? (session?.event_name ?? session?.subject ?? "Event Session")
        : (session?.subject ?? "Unknown Subject"),
      sessionDate: session?.created_at ?? "",
      rows,
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
        const csv = buildSingleCsv(data.rows);
        const filename = `attendance_${data.sectionName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}`;
        await shareCsv(csv, filename);
      } else {
        const html = buildSingleSessionHtml({
          sectionName: data.sectionName,
          subject: data.subject,
          sessionDate: data.sessionDate,
          rows: data.rows,
        });
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      }

      logAction("session_created", {
        description: `Generated ${exportFormat.toUpperCase()} single-session report`,
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
      <StatusBar barStyle="dark-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>Attendance Reports</Text>
          <Text style={styles.subtitle}>Choose what you want to export.</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>
            {showSectionPicker ? "Section" : "Session"}
          </Text>

          {showSectionPicker ? (
            <View style={styles.optionList}>
              {sections.map((s) => {
                const selected = selectedSectionId === s.id;

                return (
                  <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.75}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => setSelectedSectionId(s.id)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {s.name}
                    </Text>

                    {selected && (
                      <View style={styles.selectedMark}>
                        <Text style={styles.selectedMarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : ownSessions.length === 0 ? (
            <Text style={styles.hint}>
              No event sessions yet. Create one from the QR Generator.
            </Text>
          ) : (
            <View style={styles.optionList}>
              {ownSessions.map((s) => {
                const selected = selectedSessionId === s.id;

                return (
                  <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.75}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => setSelectedSessionId(s.id)}
                  >
                    <View style={styles.optionContent}>
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {s.event_name || s.subject}
                      </Text>

                      <Text style={styles.optionMeta}>
                        {new Date(s.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        ·{" "}
                        {new Date(s.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>

                    {selected && (
                      <View style={styles.selectedMark}>
                        <Text style={styles.selectedMarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {showSectionPicker && (
          <View style={styles.formSection}>
            <Text style={styles.label}>Session</Text>

            {!selectedSectionId ? (
              <Text style={styles.hint}>Select a section first.</Text>
            ) : sessions.length === 0 ? (
              <Text style={styles.hint}>
                No sessions found for this section.
              </Text>
            ) : (
              <View style={styles.optionList}>
                {sessions.map((s) => {
                  const selected = selectedSessionId === s.id;

                  return (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.75}
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => setSelectedSessionId(s.id)}
                    >
                      <View style={styles.optionContent}>
                        <Text
                          style={[
                            styles.optionText,
                            selected && styles.optionTextSelected,
                          ]}
                        >
                          {s.subject}
                        </Text>

                        <Text style={styles.optionMeta}>
                          {new Date(s.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          ·{" "}
                          {new Date(s.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>

                      {selected && (
                        <View style={styles.selectedMark}>
                          <Text style={styles.selectedMarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.label}>Export Format</Text>

          <View style={styles.formatRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.formatOption,
                exportFormat === "pdf" && styles.formatSelected,
              ]}
              onPress={() => setExportFormat("pdf")}
            >
              <Text
                style={[
                  styles.formatText,
                  exportFormat === "pdf" && styles.formatTextSelected,
                ]}
              >
                PDF
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.formatOption,
                exportFormat === "csv" && styles.formatSelected,
              ]}
              onPress={() => setExportFormat("csv")}
            >
              <Text
                style={[
                  styles.formatText,
                  exportFormat === "csv" && styles.formatTextSelected,
                ]}
              >
                Excel (CSV)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.generateButton,
            generating && styles.generateButtonDisabled,
          ]}
          onPress={generateReport}
          disabled={generating}
        >
          <Text style={styles.generateButtonText}>
            {generating
              ? "Generating..."
              : `Generate ${exportFormat === "pdf" ? "PDF" : "CSV"} Report`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildSingleSessionHtml({
  sectionName,
  subject,
  sessionDate,
  rows,
}: {
  sectionName: string;
  subject: string;
  sessionDate: string;
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
        .meta { color: #666; font-size: 13px; margin-bottom: 16px; }
        .summary { display: flex; gap: 24px; margin-bottom: 24px; }
        .summary-box { text-align: center; }
        .summary-num { font-size: 22px; font-weight: bold; }
        .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; background: #f5f5f5; padding: 8px; font-size: 12px; text-transform: uppercase; color: #666; }
        td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
      </style></head>
      <body>
        <h1>${subject} — ${sectionName}</h1>
        <div class="meta">${new Date(sessionDate).toLocaleString()}</div>
        <div class="summary">
          <div class="summary-box"><div class="summary-num" style="color:#2e7d32;">${presentCount}</div><div class="summary-label">Present</div></div>
          <div class="summary-box"><div class="summary-num" style="color:#e65100;">${lateCount}</div><div class="summary-label">Late</div></div>
          <div class="summary-box"><div class="summary-num" style="color:#c62828;">${absentCount}</div><div class="summary-label">Absent</div></div>
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
  container: {
    flex: 1,
    backgroundColor: "#F9F9FF",
  },

  scroll: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 48,
  },

  heading: {
    marginTop: 42,
    marginBottom: 28,
  },

  title: {
    color: "#17181C",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  subtitle: {
    color: "#85899B",
    fontSize: 13,
    marginTop: 5,
  },

  formSection: {
    marginBottom: 25,
  },

  label: {
    color: "#272930",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 9,
  },

  hint: {
    color: "#989BA5",
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: 4,
  },

  optionList: {
    gap: 7,
  },

  option: {
    minHeight: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E9E9E4",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  optionSelected: {
    borderColor: "#305CDE",
    backgroundColor: "#F2F5FF",
  },

  optionContent: {
    flex: 1,
  },

  optionText: {
    color: "#303239",
    fontSize: 13,
    fontWeight: "600",
  },

  optionTextSelected: {
    color: "#305CDE",
    fontWeight: "700",
  },

  optionMeta: {
    color: "#999CA5",
    fontSize: 10,
    marginTop: 3,
  },

  selectedMark: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: "#305CDE",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  selectedMarkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  formatRow: {
    flexDirection: "row",
    gap: 8,
  },

  formatOption: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E4E5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  formatSelected: {
    backgroundColor: "#305CDE",
    borderColor: "#305CDE",
  },

  formatText: {
    color: "#777A84",
    fontSize: 12,
    fontWeight: "700",
  },

  formatTextSelected: {
    color: "#FFFFFF",
  },

  errorText: {
    color: "#C85D4D",
    fontSize: 12,
    marginBottom: 12,
  },

  generateButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: "#305CDE",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  generateButtonDisabled: {
    opacity: 0.5,
  },

  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
