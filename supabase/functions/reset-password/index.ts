import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: callerProfile } = await supabaseUser
      .from("profiles")
      .select("role, school_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403 });
    }

    const { targetUserId, newPassword } = await req.json();
    if (!targetUserId || !newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Scope check: target must be in the SAME school
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("school_id")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile || targetProfile.school_id !== callerProfile.school_id) {
      return new Response(JSON.stringify({ error: "Account not found in your school" }), { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});