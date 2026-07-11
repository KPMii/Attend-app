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
  subscribeToProfileChanges: () => void;
};

let profileChannel: ReturnType<typeof supabase.channel> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  role: null,
  fullName: null,
  schoolId: null,
  schoolIdNo: null,
  loading: true,

  hydrate: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, school_id, school_id_no")
      .eq("id", session.user.id)
      .single();

    set({
      userId: session.user.id,
      role: profile?.role ?? null,
      fullName: profile?.full_name ?? null,
      schoolId: profile?.school_id ?? null,
      schoolIdNo: profile?.school_id_no ?? null,
      loading: false,
    });

    // Start listening for live changes to THIS user's profile
    get().subscribeToProfileChanges();
  },

  subscribeToProfileChanges: () => {
    const userId = get().userId;
    if (!userId) return;

    // Avoid duplicate subscriptions
    if (profileChannel) {
      supabase.removeChannel(profileChannel);
    }

    profileChannel = supabase
      .channel(`profile-changes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log("[AuthStore] Profile updated live:", payload.new);
          set({
            role: payload.new.role ?? null,
            fullName: payload.new.full_name ?? null,
            schoolId: payload.new.school_id ?? null,
            schoolIdNo: payload.new.school_id_no ?? null,
          });
        },
      )
      .subscribe();
  },

  logout: async () => {
    if (profileChannel) {
      supabase.removeChannel(profileChannel);
      profileChannel = null;
    }
    await supabase.auth.signOut();
    set({
      userId: null,
      role: null,
      fullName: null,
      schoolId: null,
      schoolIdNo: null,
    });
  },
}));

supabase.auth.onAuthStateChange(() => {
  useAuthStore.getState().hydrate();
});
