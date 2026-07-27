import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildRangeCsv(rows: { name: string; schoolId: string; present: number; late: number; absent: number; total: number }[]) {
  const header = "Student Name,School ID,Present,Late,Absent,Attendance %";
  const body = rows.map(r => `${escapeCsv(r.name)},${escapeCsv(r.schoolId)},${r.present},${r.late},${r.absent},${r.total > 0 ? Math.round(((r.present + r.late) / r.total) * 100) : 0}`).join("\n");
  return `${header}\n${body}`;
}

export function buildSingleCsv(rows: { name: string; schoolId: string; status: string; scannedAt: string | null }[]) {
  const header = "Student Name,School ID,Status,Time Scanned";
  const body = rows.map(r => `${escapeCsv(r.name)},${escapeCsv(r.schoolId)},${r.status},${r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString() : "—"}`).join("\n");
  return `${header}\n${body}`;
}

export async function shareCsv(csvContent: string, filename: string) {
  const fileUri = `${FileSystem.cacheDirectory}${filename}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Export Attendance Report" });
  }
}
