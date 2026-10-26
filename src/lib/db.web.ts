import AsyncStorage from "@react-native-async-storage/async-storage";

// Web fallback - SQLite is not available in the browser, so offline-first
// catalog caching (subjects/sections) uses AsyncStorage, which maps to
// localStorage on web. Sessions/attendance are still synced straight to
// Supabase on web.

const SUBJECTS_KEY = "dumalo.cache.subjects";
const SECTIONS_KEY = "dumalo.cache.sections";

export async function getDB(): Promise<never> {
  throw new Error("SQLite is not available on web");
}

export async function saveSession(_session: any) {
  // No-op on web - session is synced directly to Supabase instead
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

export async function getLocalSessions(_facultyId: string): Promise<any[]> {
  return [];
}

export async function getLocalSession(_id: string): Promise<any | null> {
  return null;
}

export async function cacheSubjects(subjects: { id: string; name: string }[]) {
  await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects));
}

export async function getCachedSubjects(): Promise<{ id: string; name: string }[]> {
  const raw = await AsyncStorage.getItem(SUBJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function cacheSections(
  sections: { id: string; name: string; room: string | null }[],
) {
  await AsyncStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
}

export async function getCachedSections(): Promise<
  { id: string; name: string; room: string | null }[]
> {
  const raw = await AsyncStorage.getItem(SECTIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}