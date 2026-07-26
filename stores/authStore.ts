import { supabase } from "@/lib/supabase";
import { create } from "zustand";
import { ROLE_PERMISSIONS, type Permission, type Role } from "../src/lib/permissions";

type AuthState = {
  userId: string | null;
  role: Role | null;
  fullName: string | null;
  schoolId: string | null;
  schoolIdNo: string | null;
  loading: boolean;
  hasPermission: (code: Permission) => boolean;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  role: null,
  fullName: null,
  schoolId: null,
  schoolIdNo: null,
  loading: true,

  hasPermission: (code: Permission) => {
    const role = get().role;
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(code) ?? false;
  },

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
      role: (profile?.role as Role) ?? null,
      fullName: profile?.full_name ?? null,
      schoolId: profile?.school_id ?? null,
      schoolIdNo: profile?.school_id_no ?? null,
      loading: false,
    });
  },

  logout: async () => {
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
