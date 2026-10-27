import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

let SQLiteModule: typeof import("expo-sqlite") | null = null;
if (Platform.OS !== "web") {
  SQLiteModule = require("expo-sqlite");
}

let db: SQLiteDatabase;
let dbInitPromise: Promise<SQLiteDatabase> | null = null;

export async function getDB() {
  if (Platform.OS === "web") {
    throw new Error("SQLite is not available on web");
  }

  if (db) return db;

  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      db = await SQLiteModule!.openDatabaseAsync("attendance.db");
      await setupSchema();
      return db;
    })();
  }

  return dbInitPromise;
}

async function setupSchema() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      room TEXT NOT NULL,
      faculty_id TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      role TEXT NOT NULL,
      late_threshold_minutes INTEGER DEFAULT 10,
      session_type TEXT,
      event_name TEXT,
      section_id TEXT,
      subject_id TEXT,
      school_id TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS token_rotations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      token TEXT NOT NULL,
      rotated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      scanned_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'present',
      token_used TEXT,
      payload TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      room TEXT
    );
  `);

  try {
    await db.execAsync(
      `ALTER TABLE sessions ADD COLUMN late_threshold_minutes INTEGER DEFAULT 10;`,
    );
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await db.execAsync(
      `ALTER TABLE attendance ADD COLUMN status TEXT NOT NULL DEFAULT 'present';`,
    );
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN session_type TEXT;`);
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN event_name TEXT;`);
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN section_id TEXT;`);
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN subject_id TEXT;`);
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN school_id TEXT;`);
  } catch {
    // Column already exists - safe to ignore
  }
  try {
    await db.execAsync(`ALTER TABLE attendance ADD COLUMN token_used TEXT;`);
  } catch {
    // Column already exists - safe to ignore
  }
  try {
    await db.execAsync(`ALTER TABLE attendance ADD COLUMN payload TEXT;`);
  } catch {
    // Column already exists - safe to ignore
  }
}

export type LocalSessionRow = {
  id: string;
  subject: string;
  room: string;
  faculty_id: string;
  token: string;
  created_at: string;
  expires_at: string;
  role: string;
  late_threshold_minutes: number;
  session_type: string | null;
  event_name: string | null;
  section_id: string | null;
  subject_id: string | null;
  school_id: string | null;
  synced: number;
};

export async function saveSession(session: {
  id: string;
  subject: string;
  room: string;
  faculty_id: string;
  token: string;
  created_at: string;
  expires_at: string;
  role: string;
  late_threshold_minutes: number;
  session_type?: string | null;
  event_name?: string | null;
  section_id?: string | null;
  subject_id?: string | null;
  school_id?: string | null;
}) {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO sessions
    (id, subject, room, faculty_id, token, created_at, expires_at, role, late_threshold_minutes, session_type, event_name, section_id, subject_id, school_id, synced)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
    [
      session.id,
      session.subject,
      session.room,
      session.faculty_id,
      session.token,
      session.created_at,
      session.expires_at,
      session.role,
      session.late_threshold_minutes,
      session.session_type ?? null,
      session.event_name ?? null,
      session.section_id ?? null,
      session.subject_id ?? null,
      session.school_id ?? null,
    ],
  );
}

export async function getLocalSessions(
  facultyId: string,
): Promise<LocalSessionRow[]> {
  const db = await getDB();
  const rows = await db.getAllAsync(
    "SELECT * FROM sessions WHERE faculty_id = ? ORDER BY created_at DESC",
    [facultyId],
  );
  return rows as LocalSessionRow[];
}

export async function getLocalSession(
  id: string,
): Promise<LocalSessionRow | null> {
  const db = await getDB();
  const rows = await db.getAllAsync("SELECT * FROM sessions WHERE id = ?", [
    id,
  ]);
  return (rows[0] as LocalSessionRow) ?? null;
}

export async function saveAttendance(record: {
  id: string;
  session_id: string;
  student_id: string;
  scanned_at: string;
  status: string;
  token_used?: string;
  payload?: string;
}) {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO attendance
    (id, session_id, student_id, scanned_at, status, token_used, payload, synced)
    VALUES (?,?,?,?,?,?,?,0)`,
    [
      record.id,
      record.session_id,
      record.student_id,
      record.scanned_at,
      record.status,
      record.token_used ?? null,
      record.payload ?? null,
    ],
  );
}

export async function getUnsyncedSessions() {
  const db = await getDB();
  return await db.getAllAsync("SELECT * FROM sessions WHERE synced = 0");
}

export async function getUnsyncedTokenRotations() {
  const db = await getDB();
  return await db.getAllAsync("SELECT * FROM token_rotations WHERE synced = 0");
}

export async function getUnsyncedAttendance() {
  const db = await getDB();
  return await db.getAllAsync("SELECT * FROM attendance WHERE synced = 0");
}

export async function markSynced(table: string, id: string) {
  const db = await getDB();
  await db.runAsync(`UPDATE ${table} SET synced = 1 WHERE id = ?`, [id]);
}

export async function cacheSubjects(subjects: { id: string; name: string }[]) {
  const db = await getDB();
  for (const s of subjects) {
    await db.runAsync(
      `INSERT OR REPLACE INTO subjects (id, name) VALUES (?, ?)`,
      [s.id, s.name],
    );
  }
}

export async function getCachedSubjects(): Promise<
  { id: string; name: string }[]
> {
  const db = await getDB();
  const rows = await db.getAllAsync(
    "SELECT id, name FROM subjects ORDER BY name",
  );
  return rows as { id: string; name: string }[];
}

export async function cacheSections(
  sections: { id: string; name: string; room: string | null }[],
) {
  const db = await getDB();
  for (const s of sections) {
    await db.runAsync(
      `INSERT OR REPLACE INTO sections (id, name, room) VALUES (?, ?, ?)`,
      [s.id, s.name, s.room ?? null],
    );
  }
}

export async function getCachedSections(): Promise<
  { id: string; name: string; room: string | null }[]
> {
  const db = await getDB();
  const rows = await db.getAllAsync(
    "SELECT id, name, room FROM sections ORDER BY name",
  );
  return rows as { id: string; name: string; room: string | null }[];
}
