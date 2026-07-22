import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { logAction } from "../../../../lib/audit";
import { supabase } from "../../../../lib/supabase";

type Section = { id: string; name: string };
type SessionRow = { id: string; subject: string; created_at: string };

export default function Reports() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  const [reportMode, setReportMode] = useState<"range" | "single">("range");

  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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
    if (!selectedSectionId || reportMode !== "single") return;
    loadSessions();
  }, [selectedSectionId, reportMode]);

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

  const generateRangeReport = async () => {
    const sectionName =
      sections.find((s) => s.id === selectedSectionId)?.name ?? "Unknown Section";

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
      if (!attendanceMap.has(a.student_id)) attendanceMap.set(a.student_id, new Map());
      attendanceMap.get(a.student_id)!.set(a.session_id, a.status);
    });

    const summaryRows = (roster ?? []).map((student: any) => {
      const studentAttendance = attendanceMap.get(student.student_id) ?? new Map();
      let present = 0, late = 0, absent = 0;
      (rangeSessions ?? []).forEach((s) => {
        const status = studentAttendance.get(s.id);
        if (status === "present") present++;
        else if (status === "late") late++;
        else absent++;
      });
      return {
        name: student.full_name,
        schoolId: student.school_id_no,
        present, late, absent,
        total: (rangeSessions ?? []).length,
      };
    });

    return buildRangeReportHtml({
      sectionName,
      startDate,
      endDate,
      totalSessions: (rangeSessions ?? []).length,
      rows: summaryRows,
    });
  };

  const generateSingleSessionReport = async () => {
    const sectionName =
      sections.find((s) => s.id === selectedSectionId)?.name ?? "Unknown Section";
    const session = sessions.find((s) => s.id === selectedSessionId);

    const { data: roster } = await supabase.rpc("get_section_roster", {
      p_section_id: selectedSectionId,
    });

    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status, scanned_at")
      .eq("session_id", selectedSessionId);

    const attendanceMap = new Map(
      (attendance ?? []).map((a) => [a.student_id, { status: a.status, scannedAt: a.scanned_at }]),
    );

    const rows = (roster ?? []).map((student: any) => {
      const record = attendanceMap.get(student.student_id);
      return {
        name: student.full_name,
        schoolId: student.school_id_no,
        status: record?.status ?? "absent",
        scannedAt: record?.scannedAt ?? null,
      };
    });

    rows.sort((a, b) => a.name.localeCompare(b.name));

    return buildSingleSessionHtml({
      sectionName,
      subject: session?.subject ?? "Unknown Subject",
      sessionDate: session?.created_at ?? "",
      rows,
    });
  };

  const generateReport = async () => {
    if (!selectedSectionId) {
      setError("Please select a section");
      return;
    }
    if (reportMode === "single" && !selectedSessionId) {
      setError("Please select a session");
      return;
    }

    setError(null);
    setGenerating(true);

    try {
      const html =
        reportMode === "single"
          ? await generateSingleSessionReport()
          : await generateRangeReport();

      const { uri } = await Print.printToFileAsync({ html });

      logAction("session_created", {
        description:
          reportMode === "single"
            ? `Generated single-session report`
            : `Generated range report (${startDate} to ${endDate})`,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (err) {
      console.error("Report generation error:", err);
      setError("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Attendance Reports</Text>

        <View style={styles.typeToggleRow}>
          <TouchableOpacity
            style={[styles.typeToggle, reportMode === "range" && styles.typeToggleActive]}
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
            style={[styles.typeToggle, reportMode === "single" && styles.typeToggleActive]}
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

        <Text style={styles.label}>Section</Text>
        <View style={styles.chipRow}>
          {sections.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.chip, selectedSectionId === s.id && styles.chipActive]}
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

        {reportMode === "range" ? (
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
        ) : (
          <>
            <Text style={styles.label}>Session</Text>
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
                      {new Date(s.created_at).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
          onPress={generateReport}
          disabled={generating}
        >
          <Text style={styles.generateBtnText}>
            {generating ? "Generating..." : "Generate PDF Report"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function buildRangeReportHtml({
  sectionName, startDate, endDate, totalSessions, rows,
}: {
  sectionName: string; startDate: string; endDate: string; totalSessions: number;
  rows: { name: string; schoolId: string; present: number; late: number; absent: number; total: number }[];
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
  sectionName, subject, sessionDate, rows,
}: {
  sectionName: string; subject: string; sessionDate: string;
  rows: { name: string; schoolId: string; status: string; scannedAt: string | null }[];
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
  typeToggle: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  typeToggleActive: { backgroundColor: "#C8F04D" },
  typeToggleText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "700" },
  typeToggleTextActive: { color: "#0D0D0D" },
  label: {
    color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600",
    marginTop: 12, textTransform: "uppercase",
  },
  hint: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipActive: { backgroundColor: "rgba(200,240,77,0.14)", borderColor: "#C8F04D" },
  chipText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: "#C8F04D" },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: "#fff", fontSize: 15,
  },
  sessionList: { gap: 6 },
  sessionRow: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "transparent",
  },
  sessionRowActive: { borderColor: "#C8F04D", backgroundColor: "rgba(200,240,77,0.08)" },
  sessionSubject: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sessionDate: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  errorText: { color: "#F2816B", fontSize: 13, marginTop: 12 },
  generateBtn: {
    backgroundColor: "#C8F04D", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", marginTop: 24,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { color: "#0D0D0D", fontSize: 16, fontWeight: "800" },
});