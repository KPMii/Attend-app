// Web stub — SQLite isn't available in the browser.
// Web always has internet, so offline-first storage isn't needed here.

export async function getDB(): Promise<never> {
  throw new Error("SQLite is not available on web");
}

export async function saveSession(_session: any) {
  // No-op on web — session is synced directly to Supabase instead
}

export async function saveAttendance(_record: any) {
  // No-op on web
}

export async function getUnsyncedSessions() {
  return [];
}

export async function getUnsyncedTokenRotations() {
  return [];
}

export async function getUnsyncedAttendance() {
  return [];
}

export async function markSynced(_table: string, _id: string) {
  // No-op on web
}
