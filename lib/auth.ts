import { supabase } from "./supabase";

const STUDENT_EMAIL_DOMAIN = "students.attendapp.local";

export async function studentLogin(schoolIdNo: string, password: string) {
  const email = `${schoolIdNo.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function facultyLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}
