import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { logAction } from "./audit";
import { supabase } from "./supabase";

export async function generateSessionPdf(sessionId: string) {
  // Get the session's real details
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, subject, room, section_id, created_at, session_type, event_name")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error("Session not found");
  }

  let rows: {
    name: string;
    schoolId: string;
    status: string;
    scannedAt: string | null;
  }[] = [];

  let sectionName = "—";

  if (session.section_id) {
    // Class session — pull roster + attendance, mark absent for anyone unrecorded
    const { data: sectionData } = await supabase
      .from("sections")
      .select("name")
      .eq("id", session.section_id)
      .single();
    sectionName = sectionData?.name ?? "—";

    const { data: roster } = await supabase.rpc("get_section_roster", {
      p_section_id: session.section_id,
    });

    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status, scanned_at")
      .eq("session_id", sessionId);

    const attendanceMap = new Map(
      (attendance ?? []).map((a) => [a.student_id, { status: a.status, scannedAt: a.scanned_at }]),
    );

    rows = (roster ?? [])
      .map((student: any) => {
        const record = attendanceMap.get(student.student_id);
        return {
          name: student.full_name,
          schoolId: student.school_id_no,
          status: record?.status ?? "absent",
          scannedAt: record?.scannedAt ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Event session — no fixed roster, just show everyone who actually scanned
    const { data: attendance } = await supabase
      .from("attendance")
      .select("student_id, status, scanned_at, profiles(full_name, school_id_no)")
      .eq("session_id", sessionId);

    rows = (attendance ?? [])
      .map((a: any) => ({
        name: a.profiles?.full_name ?? "Unknown",
        schoolId: a.profiles?.school_id_no ?? "—",
        status: a.status,
        scannedAt: a.scanned_at,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const title = session.session_type === "event" ? session.event_name : session.subject;
  const subtitle = session.session_type === "event" ? session.room : sectionName;

  const html = buildHtml({
    title: title ?? "Untitled",
    subtitle: subtitle ?? "—",
    sessionDate: session.created_at,
    rows,
  });

  const { uri } = await Print.printToFileAsync({ html });

  logAction("session_created", {
    tableName: "sessions",
    recordId: sessionId,
    description: `Generated PDF for session: ${title}`,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
}

function buildHtml({
  title,
  subtitle,
  sessionDate,
  rows,
}: {
  title: string;
  subtitle: string;
  sessionDate: string;
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
      <td style="text-align:center; color:${statusColor[r.status] ?? "#666"}; font-weight:bold; text-transform:capitalize;">
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
        <h1>${title} — ${subtitle}</h1>
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