import { create } from "zustand";
import { supabase } from "../lib/supabase";

type Role = "student" | "faculty" | "admin" | null;

type AuthState = {
  userId: string | null;
  role: Role;
  fullName: string | null;
  schoolId: string | null;
  schoolIdNo: string | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  fullName: null,
  schoolId: null,
  schoolIdNo: null,
  loading: true,

  hydrate: async () => {
    console.log("DEBUG: hydrate() called");
    set({ loading: true });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("DEBUG: session exists?", !!session);

    if (!session?.user) {
      set({
        userId: null,
        role: null,
        fullName: null,
        schoolId: null,
        schoolIdNo: null,
        loading: false,
      });
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, full_name, school_id, school_id_no")
        .eq("id", session.user.id)
        .single();

      console.log("DEBUG: profile query result:", profile, "error:", error);

      if (error) throw error;

      set({
        userId: session.user.id,
        role: profile?.role ?? null,
        fullName: profile?.full_name ?? null,
        schoolId: profile?.school_id ?? null,
        schoolIdNo: profile?.school_id_no ?? null,
        loading: false,
      });
    } catch (err) {
      console.error("Error hydrating auth store:", err);
      set({
        userId: null,
        role: null,
        fullName: null,
        schoolId: null,
        schoolIdNo: null,
        loading: false,
      });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({
      userId: null,
      role: null,
      fullName: null,
      schoolId: null,
      schoolIdNo: null,
      loading: false,
    });
  },
}));

supabase.auth.onAuthStateChange(() => {
  useAuthStore.getState().hydrate();
});