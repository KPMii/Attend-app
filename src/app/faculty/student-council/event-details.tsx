import { supabase } from "@/lib/supabase";
import * as Print from "expo-print";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
import {
  buildSingleCsv,
  buildSingleExcel,
  shareCsv,
  shareExcel,
} from "../../../lib/csvExport";

type Row = {
  id: string;
  full_name: string;
  school_id_no: string | null;
  status: string;
  scannedAt: string;
};

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [eventInfo, setEventInfo] = useState<{
    eventName: string;
    room: string;
    createdAt: string;
  } | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);

    const { data: session } = await supabase
      .from("sessions")
      .select("event_name, room, created_at")
      .eq("id", id)
      .single();

    if (session) {
      setEventInfo({
        eventName: session.event_name,
        room: session.room,
        createdAt: session.created_at,
      });
    }

    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status, scanned_at")
      .eq("session_id", id);

    const studentIds = (attendance ?? []).map((a) => a.student_id);
    let profileMap = new Map<
      string,
      { full_name: string; school_id_no: string | null }
    >();

    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, school_id_no")
        .in("id", studentIds);

      profileMap = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          { full_name: p.full_name, school_id_no: p.school_id_no },
        ]),
      );
    }

    const combined: Row[] = (attendance ?? []).map((a) => ({
      id: a.student_id,
      full_name: profileMap.get(a.student_id)?.full_name ?? "Unknown",
      school_id_no: profileMap.get(a.student_id)?.school_id_no ?? null,
      status: a.status,
      scannedAt: a.scanned_at,
    }));

    combined.sort((a, b) => a.full_name.localeCompare(b.full_name));
    setRows(combined);
    setLoading(false);
  };

  const handleExportCsv = async () => {
    const csv = buildSingleCsv(
      rows.map((r) => ({
        name: r.full_name,
        schoolId: r.school_id_no ?? "",
        status: r.status,
        scannedAt: r.scannedAt,
      })),
    );
    await shareCsv(csv, `event_attendance_${Date.now()}`);
  };

  const handleExportExcel = async () => {
    const html = buildSingleExcel(
      rows.map((r) => ({
        name: r.full_name,
        schoolId: r.school_id_no ?? "",
        status: r.status,
        scannedAt: r.scannedAt,
      })),
      {
        title: eventInfo?.eventName ?? "Event",
        subtitle: eventInfo?.room,
        date: eventInfo?.createdAt,
      },
    );
    await shareExcel(html, `event_attendance_${Date.now()}`);
  };

  const handleExportPdf = async () => {
    const html = buildEventHtml(rows, eventInfo);
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  };

  const presentCount = rows.filter((r) => r.status === "present").length;
  const lateCount = rows.filter((r) => r.status === "late").length;

  const statusColor = (s: string) =>
    s === "present" ? "#C8F04D" : s === "late" ? "#F2C14E" : "#F2816B";

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Event Details" }} />
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {eventInfo && (
          <View style={styles.headerCard}>
            <Text style={styles.eventTitle}>{eventInfo.eventName}</Text>
            <Text style={styles.eventMeta}>
              {eventInfo.room} ·{" "}
              {new Date(eventInfo.createdAt).toLocaleString()}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#C8F04D" }]}>
              {presentCount}
            </Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryNumber, { color: "#F2C14E" }]}>
              {lateCount}
            </Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.resumeBtn}
          onPress={() =>
            router.push({
              pathname: "/faculty/qrgenerator",
              params: { resume: id },
            })
          }
        >
          <Text style={styles.resumeBtnText}>🔄 Resume / Continue Session</Text>
        </TouchableOpacity>

        <View style={styles.exportRow}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv}>
            <Text style={styles.exportBtnText}>📄 CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportExcel}
          >
            <Text style={styles.exportBtnText}>📊 Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportPdf}>
            <Text style={styles.exportBtnText}>📑 PDF</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.empty}>Loading...</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.empty}>No attendees yet</Text>
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.row}>
              <View>
                <Text style={styles.name}>{r.full_name}</Text>
                <Text style={styles.idText}>{r.school_id_no}</Text>
              </View>
              <Text style={[styles.status, { color: statusColor(r.status) }]}>
                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Build the HTML for the PDF export — matches the report generator layout
 * with the dark-themed header and attendance table.
 */
function buildEventHtml(
  rows: Row[],
  eventInfo: { eventName: string; room: string; createdAt: string } | null,
): string {
  const statusColor: Record<string, string> = {
    present: "#2e7d32",
    late: "#e65100",
    absent: "#c62828",
  };

  const presentCount = rows.filter((r) => r.status === "present").length;
  const lateCount = rows.filter((r) => r.status === "late").length;

  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td>${r.full_name}</td>
      <td>${r.school_id_no ?? "—"}</td>
      <td style="text-align:center; color:${statusColor[r.status] ?? "#666"}; font-weight:bold; text-transform:capitalize;">
        ${r.status}
      </td>
      <td style="text-align:center; color:#666;">
        ${r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString() : "—"}
      </td>
    </tr>`,
    )
    .join("");

  const title = eventInfo?.eventName ?? "Event";
  const subtitle = eventInfo?.room ?? "—";
  const date = eventInfo?.createdAt ?? new Date().toISOString();

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
        <h1>${title} — ${subtitle}</h1>
        <div class="meta">${new Date(date).toLocaleString()}</div>
        <div class="summary">
          <div class="summary-box"><div class="summary-num" style="color:#2e7d32;">${presentCount}</div><div class="summary-label">Present</div></div>
          <div class="summary-box"><div class="summary-num" style="color:#e65100;">${lateCount}</div><div class="summary-label">Late</div></div>
          <div class="summary-box"><div class="summary-num" style="color:#666;">${rows.length}</div><div class="summary-label">Total Scanned</div></div>
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
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  eventTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  eventMeta: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  summaryBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  summaryNumber: { fontSize: 24, fontWeight: "800" },
  summaryLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 },
  resumeBtn: {
    backgroundColor: "rgba(200,240,77,0.12)",
    borderWidth: 1,
    borderColor: "rgba(200,240,77,0.3)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  resumeBtnText: { color: "#C8F04D", fontSize: 14, fontWeight: "700" },
  exportRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  exportBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  exportBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
  },
  name: { color: "#fff", fontSize: 14, fontWeight: "600" },
  idText: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  status: { fontSize: 13, fontWeight: "700" },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 40 },
});
