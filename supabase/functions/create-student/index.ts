import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Verify the caller is actually an admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { data: callerProfile } = await supabaseUser
      .from("profiles")
      .select("role, school_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403 });
    }

    const { schoolIdNo, fullName, password } = await req.json();

if (!schoolIdNo || !fullName || !password) {
  return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const email = `${schoolIdNo.toLowerCase()}@students.attendapp.local`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 400 });
    }

    // Set the profile's role, name, school_id, and school_id_no
    // (handle_new_user trigger already created a blank profile row — update it)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        role: "student",
        full_name: fullName,
        school_id_no: schoolIdNo.toUpperCase(),
        school_id: callerProfile.school_id,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400 });
    }

    return new Response(
      JSON.stringify({ success: true, studentId: authData.user.id }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});