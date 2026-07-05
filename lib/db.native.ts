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
      synced INTEGER DEFAULT 0
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
}

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
}) {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO sessions 
    (id, subject, room, faculty_id, token, created_at, expires_at, role, late_threshold_minutes, synced) 
    VALUES (?,?,?,?,?,?,?,?,?,0)`,
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
    ],
  );
}

export async function saveAttendance(record: {
  id: string;
  session_id: string;
  student_id: string;
  scanned_at: string;
  status: string;
  token_used?: string;
}) {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO attendance 
    (id, session_id, student_id, scanned_at, status, synced) 
    VALUES (?,?,?,?,?,0)`,
    [
      record.id,
      record.session_id,
      record.student_id,
      record.scanned_at,
      record.status,
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
