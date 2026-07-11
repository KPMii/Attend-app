import { useAuthStore } from "../stores/authStore";
import { supabase } from "./supabase";

type AuditAction =
  | "login"
  | "logout"
  | "session_created"
  | "session_ended"
  | "attendance_recorded"
  | "profile_updated"
  | "subject_created"
  | "section_created"
  | "room_created"
  | "enrollment_added"
  | "enrollment_removed";

export async function logAction(
  action: AuditAction,
  options?: {
    tableName?: string;
    recordId?: string;
    description?: string;
  },
) {
  const { userId, schoolId } = useAuthStore.getState();
  if (!userId) return; // no logged-in user, nothing to log

  try {
    await supabase.from("audit_logs").insert({
      school_id: schoolId,
      user_id: userId,
      action,
      table_name: options?.tableName ?? null,
      record_id: options?.recordId ?? null,
      description: options?.description ?? null,
    });
  } catch (err) {
    // Never let logging failures break the actual feature
    console.log("[Audit] Failed to log action:", action, err);
  }
}
