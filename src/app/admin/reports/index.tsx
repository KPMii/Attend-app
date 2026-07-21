import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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
import { logAction } from "../../../../lib/audit";
import { supabase } from "../../../../lib/supabase";

type Section = { id: string; name: string };

export default function Reports() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
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

  const generateReport = async () => {
    if (!selectedSectionId) {
      setError("Please select a section");
      return;
    }
    setError(null);
    setGenerating(true);

    try {
      const sectionName =
        sections.find((s) => s.id === selectedSectionId)?.name ??
        "Unknown Section";

      // Fetch the roster for this section
      const { data: roster } = await supabase.rpc("get_section_roster", {
        p_section_id: selectedSectionId,
      });

      // Fetch all sessions for this section within the date range
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, subject, created_at")
        .eq("section_id", selectedSectionId)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .order("created_at");

      const sessionIds = (sessions ?? []).map((s) => s.id);

      // Fetch all attendance for those sessions
      const { data: attendance } =
        sessionIds.length > 0
          ? await supabase
              .from("attendance")
              .select("student_id, session_id, status")
              .in("session_id", sessionIds)
          : { data: [] };

      // Build a lookup: student_id -> session_id -> status
      const attendanceMap = new Map<string, Map<string, string>>();
      (attendance ?? []).forEach((a) => {
        if (!attendanceMap.has(a.student_id)) {
          attendanceMap.set(a.student_id, new Map());
        }
        attendanceMap.get(a.student_id)!.set(a.session_id, a.status);
      });

      // Build summary rows: one per student, with present/late/absent counts
      const summaryRows = (roster ?? []).map((student: any) => {
        const studentAttendance =
          attendanceMap.get(student.student_id) ?? new Map();
        let present = 0;
        let late = 0;
        let absent = 0;

        (sessions ?? []).forEach((s) => {
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
          total: (sessions ?? []).length,
        };
      });

      const html = buildReportHtml({
        sectionName,
        startDate,
        endDate,
        totalSessions: (sessions ?? []).length,
        rows: summaryRows,
      });

      const { uri } = await Print.printToFileAsync({ html });

      logAction("session_created", {
        description: `Generated report for ${sectionName} (${startDate} to ${endDate})`,
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

function buildReportHtml({
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
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; padding: 32px; color: #222; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { text-align: left; background: #f5f5f5; padding: 8px; font-size: 12px; text-transform: uppercase; color: #666; }
          td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
        </style>
      </head>
      <body>
        <h1>Attendance Report — ${sectionName}</h1>
        <div class="meta">
          Period: ${startDate} to ${endDate} · ${totalSessions} session(s) total
        </div>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>School ID</th>
              <th style="text-align:center;">Present</th>
              <th style="text-align:center;">Late</th>
              <th style="text-align:center;">Absent</th>
              <th style="text-align:center;">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  scroll: { padding: 24, gap: 8, paddingBottom: 48 },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 12,
    textTransform: "uppercase",
  },
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
});
