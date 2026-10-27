import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Must stay byte-for-byte in sync with sign-session/index.ts.
function canonicalString(p: Record<string, unknown>): string {
  return JSON.stringify({
    id: p.id,
    token: p.token,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
    facultyId: p.facultyId,
    schoolId: p.schoolId ?? null,
    subject: p.subject,
    room: p.room,
    subjectId: p.subjectId ?? null,
    sectionId: p.sectionId ?? null,
    sessionType: p.sessionType,
    eventName: p.eventName ?? null,
    lateThresholdMinutes: p.lateThresholdMinutes,
  });
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySignature(
  payload: Record<string, unknown>,
  secret: string,
): Promise<boolean> {
  if (!payload || typeof payload.signature !== "string") return false;
  const expected = await hmacSha256Hex(secret, canonicalString(payload));
  return expected === payload.signature;
}

// supabase-js only auto-parses responses whose Content-Type is application/json;
// otherwise it returns the raw text, so always set the header explicitly.
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const session = body?.session as Record<string, unknown> | undefined;
    const attendance = body?.attendance as Record<string, unknown> | undefined;
    if (!session || !attendance) {
      return json({ error: "Missing session or attendance" }, 400);
    }

    const secret = Deno.env.get("QR_SIGNING_SECRET");
    if (!secret) {
      return json({ error: "Signing secret is not configured" }, 500);
    }

    // 1. Cryptographic verification (HMAC-SHA256, server-side secret).
    if (!(await verifySignature(session, secret))) {
      return json({ valid: false, reason: "invalid_signature" });
    }

    // 2. Expiry check.
    const expiresAt = new Date(String(session.expiresAt)).getTime();
    if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
      return json({ valid: false, reason: "expired" });
    }

    // 3. Server-authoritative multi-tenant guard.
    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();
    if (session.schoolId && profile?.school_id && session.schoolId !== profile.school_id) {
      return json({ valid: false, reason: "wrong_school" });
    }

    // 4. Roster check for class sessions (authoritative server-side).
    if (session.sessionType === "class" && session.sectionId) {
      const { data: enrollment, error } = await supabaseUser
        .from("section_enrollments")
        .select("id")
        .eq("section_id", String(session.sectionId))
        .eq("student_id", user.id)
        .maybeSingle();
      if (!error && !enrollment) {
        return json({ valid: false, reason: "not_enrolled" });
      }
    }

    // 5. Derive late/present server-side (do not trust the client).
    const scannedAt = new Date(String(attendance.scanned_at)).getTime();
    const sessionStart = new Date(String(session.createdAt)).getTime();
    const thresholdMs = Number(session.lateThresholdMinutes ?? 10) * 60 * 1000;
    let status = "present";
    if (Number.isFinite(scannedAt) && Number.isFinite(sessionStart)) {
      status = scannedAt - sessionStart > thresholdMs ? "late" : "present";
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 6. De-duplicate: one attendance record per student per session.
    const { data: existing } = await supabaseAdmin
      .from("attendance")
      .select("id")
      .eq("session_id", String(session.id))
      .eq("student_id", user.id)
      .maybeSingle();
    if (existing) {
      return json({ valid: true, attendance_id: existing.id, duplicate: true });
    }

    // 7. Record attendance with the service role (idempotent upsert).
    const { error: upsertError } = await supabaseAdmin.from("attendance").upsert(
      {
        id: String(attendance.id),
        session_id: String(session.id),
        student_id: user.id,
        scanned_at: String(attendance.scanned_at),
        status,
        token_used: String(session.token ?? ""),
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      return json({ error: upsertError.message }, 500);
    }

    return json({ valid: true, attendance_id: attendance.id, status });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
