import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// The canonical field order is security-critical: sign-session and
// verify-session must stringify the exact same fields in the exact same
// order, otherwise the HMAC will never match.
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

// supabase-js only auto-parses responses whose Content-Type is application/json;
// otherwise it returns the raw text, so always set the header explicitly.
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ALLOWED_ROLES = new Set(["faculty", "admin", "student_council_officer"]);

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

    const { data: profile } = await supabaseUser
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !ALLOWED_ROLES.has(profile.role)) {
      return json({ error: "Forbidden — faculty/admin only" }, 403);
    }

    const payload = await req.json();
    if (!payload || !payload.id || !payload.token || !payload.expiresAt) {
      return json({ error: "Missing required fields" }, 400);
    }

    // The signed session must be attributed to the authenticated caller.
    if (payload.facultyId && payload.facultyId !== user.id) {
      return json({ error: "facultyId does not match authenticated user" }, 403);
    }

    const secret = Deno.env.get("QR_SIGNING_SECRET");
    if (!secret) {
      return json({ error: "Signing secret is not configured" }, 500);
    }

    const signature = await hmacSha256Hex(secret, canonicalString(payload));
    return json({ signature });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
