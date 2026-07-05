import { create } from "zustand";
import { supabase } from "../lib/supabase";

type Role = "student" | "faculty" | "admin" | null;

type AuthState = {
  userId: string | null;
  role: Role;
  fullName: string | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  fullName: null,
  loading: true,

  hydrate: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      set({ userId: null, role: null, fullName: null, loading: false });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", session.user.id)
      .single();

    set({
      userId: session.user.id,
      role: profile?.role ?? null,
      fullName: profile?.full_name ?? null,
      loading: false,
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ userId: null, role: null, fullName: null });
  },
}));

supabase.auth.onAuthStateChange(() => {
  useAuthStore.getState().hydrate();
});
