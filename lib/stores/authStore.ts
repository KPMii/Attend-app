import { create } from "zustand";
import { supabase } from "../../lib/supabase"; // Adjust this path if your folders differ

interface AuthState {
  userId: string | null;
  role: string | null;
  fullName: string | null;
  schoolId: string | null; // ← Baked into the core state
  loading: boolean;
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  fullName: null,
  schoolId: null,
  loading: true,

  initializeAuth: async () => {
    set({ loading: true });

    // 1. Get the current active session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      set({
        userId: null,
        role: null,
        fullName: null,
        schoolId: null,
        loading: false,
      });
      return;
    }

    try {
      // 2. Fetch profile metadata including the vital school_id
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, full_name, school_id")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      // 3. Update the global state
      set({
        userId: session.user.id,
        role: profile?.role ?? null,
        fullName: profile?.full_name ?? null,
        schoolId: profile?.school_id ?? null, // ← Available app-wide
        loading: false,
      });
    } catch (err) {
      console.error("Error hydrating auth store:", err);
      set({
        userId: null,
        role: null,
        fullName: null,
        schoolId: null,
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
      loading: false,
    });
  },
}));
