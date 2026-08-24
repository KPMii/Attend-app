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
import { logAction } from "../../../lib/audit";
import { buildSingleCsv, shareCsv } from "../../../lib/csvExport";
import { supabase } from "../../../lib/supabase";

type Section = { id: string; name: string };
type SessionRow = { id: string; subject: string; created_at: string };
type ExportFormat = "pdf" | "csv";

export default function Reports() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );

  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("sections")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setSections(data);
      });
  }, []);

  useEffect(() => {
    if (!selectedSectionId) return;
    loadSessions();
  }, [selectedSectionId]);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("id, subject, created_at")
      .eq("section_id", selectedSectionId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setSessions(data);
    setSelectedSessionId(null);
  };

  const fetchReportData = async () => {
    if (!selectedSectionId) {
      setError("Please select a section");
      return null;
    }
    if (!selectedSessionId) {
      setError("Please select a session");
      return null;
    }

    const sectionName =
      sections.find((s) => s.id === selectedSectionId)?.name ??
      "Unknown Section";

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
    return {
      sectionName,
      subject: session?.subject ?? "Unknown Subject",
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
        await shareCsv(
          csv,
          `attendance_${data.sectionName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}`,
        );
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Attendance Reports</Text>

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

        {!selectedSectionId ? (
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
              </TouchableOpacity>
            ))}
          </View>
        )}

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
  container: { flex: 1, backgroundColor: "#FBFBFF" },
  scroll: { padding: 24, gap: 8, paddingBottom: 48 },
  title: {
    color: "#17181C",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 36,
    fontFamily: "Inter_400Regular",
  },
  label: {
    color: "#85899B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    textTransform: "uppercase",
    fontFamily: "Inter_400Regular",
  },
  hint: {
    color: "#9A9DA6",
    fontSize: 13,
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ECECE7",
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: "#F0F3FF",
    borderColor: "#305CDE",
  },
  chipText: {
    color: "#85899B",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  chipTextActive: {
    color: "#305CDE",
    fontFamily: "Inter_400Regular",
  },
  sessionList: { gap: 6 },
  sessionRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ECECE7",
  },
  sessionRowActive: {
    borderColor: "#305CDE",
    backgroundColor: "#F0F3FF",
  },
  sessionSubject: {
    color: "#17181C",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  sessionDate: {
    color: "#85899B",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    color: "#C85D4D",
    fontSize: 13,
    marginTop: 12,
    fontFamily: "Inter_400Regular",
  },
  generateBtn: {
    backgroundColor: "#305CDE",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Inter_400Regular",
  },
  formatToggleRow: {
    flexDirection: "row",
    backgroundColor: "#F0F1F6",
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
  formatToggleActive: { backgroundColor: "#305CDE" },
  formatToggleText: {
    color: "#85899B",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_400Regular",
  },
  formatToggleTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
  },
});
