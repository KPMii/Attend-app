import NetInfo from "@react-native-community/netinfo";
import {
  getUnsyncedAttendance,
  getUnsyncedSessions,
  getUnsyncedTokenRotations,
  markSynced,
} from "./db";
import { supabase } from "./supabase";

export async function syncPendingQueue() {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    console.log("[SyncQueue] Offline — skipping sync");
    return;
  }

  console.log("[SyncQueue] Online — syncing pending records...");

  await syncSessions();
  await syncAttendance();
  await syncTokenRotations();
}

async function syncSessions() {
  try {
    const unsynced = (await getUnsyncedSessions()) as any[];

    if (unsynced.length === 0) {
      console.log("[SyncQueue] No sessions to sync");
      return;
    }

    for (const session of unsynced) {
      try {
        const { error } = await supabase.from("sessions").upsert({
          id: session.id,
          subject: session.subject,
          room: session.room,
          faculty_id: session.faculty_id,
          token: session.token,
          created_at: session.created_at,
          expires_at: session.expires_at,
          role: session.role,
          late_threshold_minutes: session.late_threshold_minutes,
        });

        if (error) throw error;

        await markSynced("sessions", session.id);
        console.log("[SyncQueue] Synced session:", session.id);
      } catch (err) {
        console.log("[SyncQueue] Failed session:", session.id, err);
      }
    }
  } catch (err) {
    console.log("[SyncQueue] Session sync error:", err);
  }
}

async function syncAttendance() {
  try {
    const unsynced = (await getUnsyncedAttendance()) as any[];

    if (unsynced.length === 0) {
      console.log("[SyncQueue] No attendance to sync");
      return;
    }

    for (const record of unsynced) {
      try {
        const { error } = await supabase.from("attendance").upsert({
          id: record.id,
          session_id: record.session_id,
          student_id: record.student_id,
          scanned_at: record.scanned_at,
          status: record.status,
          token_used: record.token_used,
        });

        if (error) throw error;

        await markSynced("attendance", record.id);
        console.log("[SyncQueue] Synced attendance:", record.id);
      } catch (err) {
        console.log("[SyncQueue] Failed attendance:", record.id, err);
      }
    }
  } catch (err) {
    console.log("[SyncQueue] Attendance sync error:", err);
  }
}

async function syncTokenRotations() {
  try {
    const unsynced = (await getUnsyncedTokenRotations()) as any[];

    if (unsynced.length === 0) {
      console.log("[SyncQueue] No token rotations to sync");
      return;
    }

    for (const rotation of unsynced) {
      try {
        const { error } = await supabase.from("token_rotations").upsert({
          id: rotation.id,
          session_id: rotation.session_id,
          token: rotation.token,
          rotated_at: rotation.rotated_at,
        });

        if (error) throw error;

        await markSynced("token_rotations", rotation.id);
        console.log("[SyncQueue] Synced token rotation:", rotation.id);
      } catch (err) {
        console.log("[SyncQueue] Failed token rotation:", rotation.id, err);
      }
    }
  } catch (err) {
    console.log("[SyncQueue] Token rotation sync error:", err);
  }
}
