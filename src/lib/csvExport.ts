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

function escapeHtml(val: string | number | null | undefined): string {
  if (val == null) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSingleCsv(rows: { name: string; schoolId: string; status: string; scannedAt: string | null }[]) {
  const header = "Student Name,School ID,Status,Time Scanned";
  const body = rows.map(r => `${escapeCsv(r.name)},${escapeCsv(r.schoolId)},${r.status},${r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString() : "—"}`).join("\n");
  return `${header}\n${body}`;
}

/**
 * Build an Excel-compatible HTML file (.xls) that opens in Excel/Sheets.
 * Uses the same data layout as the CSV exports.
 */
export function buildSingleExcel(
  rows: { name: string; schoolId: string; status: string; scannedAt: string | null }[],
  options?: { title?: string; subtitle?: string; date?: string },
): string {
  const presentCount = rows.filter((r) => r.status === "present").length;
  const lateCount = rows.filter((r) => r.status === "late").length;

  const rowsHtml = rows
    .map(
      (r) => `<tr>
      <td style="mso-number-format:'@'">${escapeHtml(r.name)}</td>
      <td style="mso-number-format:'@'">${escapeHtml(r.schoolId)}</td>
      <td style="font-weight:bold;color:${r.status === "present" ? "#2e7d32" : r.status === "late" ? "#e65100" : "#c62828"}">${escapeHtml(r.status)}</td>
      <td>${r.scannedAt ? escapeHtml(new Date(r.scannedAt).toLocaleTimeString()) : "—"}</td>
    </tr>`,
    )
    .join("");

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Attendance</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
table { border-collapse: collapse; width: 100%; }
th { background: #1a1a1a; color: #C8F04D; padding: 8px; font-size: 12px; text-transform: uppercase; text-align: left; }
td { padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
.title { font-size: 20px; font-weight: bold; }
.subtitle { color: #666; font-size: 13px; }
.summary { margin: 16px 0; display: flex; gap: 24px; }
.summary-box { text-align: center; }
.summary-num { font-size: 22px; font-weight: bold; }
.summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
</style>
</head>
<body>
${options?.title ? `<div class="title">${escapeHtml(options.title)}</div>` : ""}
${options?.subtitle ? `<div class="subtitle">${escapeHtml(options.subtitle)}</div>` : ""}
${options?.date ? `<div class="subtitle">${escapeHtml(new Date(options.date).toLocaleString())}</div>` : ""}
<div class="summary">
  <div class="summary-box"><div class="summary-num" style="color:#2e7d32">${presentCount}</div><div class="summary-label">Present</div></div>
  <div class="summary-box"><div class="summary-num" style="color:#e65100">${lateCount}</div><div class="summary-label">Late</div></div>
  <div class="summary-box"><div class="summary-num" style="color:#666">${rows.length}</div><div class="summary-label">Total</div></div>
</div>
<table>
<thead><tr>
  <th>Student Name</th><th>School ID</th><th>Status</th><th>Time Scanned</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</body>
</html>`;
}

export async function shareCsv(csvContent: string, filename: string) {
  const fileUri = `${FileSystem.cacheDirectory}${filename}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: "Export Attendance Report" });
  }
}

export async function shareExcel(htmlContent: string, filename: string) {
  const fileUri = `${FileSystem.cacheDirectory}${filename}.xls`;
  await FileSystem.writeAsStringAsync(fileUri, htmlContent, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: "application/vnd.ms-excel", dialogTitle: "Export Attendance Report" });
  }
}
