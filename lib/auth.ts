import { supabase } from "./supabase";

const STUDENT_EMAIL_DOMAIN = "students.attendapp.local";

export async function studentLogin(schoolIdNo: string, password: string) {
  const { data: matches } = await supabase
    .from("profiles")
    .select("school_id, schools(code)")
    .eq("school_id_no", schoolIdNo.toUpperCase())
    .eq("role", "student");

  if (!matches || matches.length === 0) {
    throw new Error("No account found with that School ID");
  }

  if (matches.length > 1) {
    throw new Error("Multiple accounts found. Please contact your admin.");
  }

  const schoolCode = (matches[0] as any).schools?.code;
  const email = `${schoolIdNo.toLowerCase()}.${schoolCode}@${STUDENT_EMAIL_DOMAIN}`;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function facultyLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}