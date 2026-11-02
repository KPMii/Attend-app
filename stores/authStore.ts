import { supabase } from "@/lib/supabase";
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ROLE_PERMISSIONS, type Permission, type Role } from "../src/lib/permissions";

type ProfileCache = {
  userId: string | null;
  role: Role | null;
  fullName: string | null;
  schoolId: string | null;
  schoolIdNo: string | null;
};

const PROFILE_CACHE_KEY = "dumalo.auth.profile";

const EMPTY_PROFILE: ProfileCache = {
  userId: null,
  role: null,
  fullName: null,
  schoolId: null,
  schoolIdNo: null,
};

async function readCachedProfile(): Promise<ProfileCache | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ProfileCache) : null;
  } catch {
    return null;
  }
}

async function writeCachedProfile(profile: ProfileCache) {
  try {
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.log("[Auth] Failed to cache profile:", err);
  }
}

async function clearCachedProfile() {
  try {
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore
  }
}

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
      await clearCachedProfile();
      set({ ...EMPTY_PROFILE, loading: false });
      return;
    }

    // Restore the cached profile immediately so the app works offline
    // on a cold start (before the network refresh below completes).
    const cached = await readCachedProfile();
    if (cached && cached.userId === session.user.id) {
      set({ ...cached, loading: false });
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, school_id, school_id_no")
        .eq("id", session.user.id)
        .single();

      const next: ProfileCache = {
        userId: session.user.id,
        role: (profile?.role as Role) ?? cached?.role ?? null,
        fullName: profile?.full_name ?? cached?.fullName ?? null,
        schoolId: profile?.school_id ?? cached?.schoolId ?? null,
        schoolIdNo: profile?.school_id_no ?? cached?.schoolIdNo ?? null,
      };
      set({ ...next, loading: false });
      await writeCachedProfile(next);
    } catch (err) {
      console.log("[Auth] Profile refresh failed (offline?), using cache:", err);
      const matches = cached?.userId === session.user.id ? cached : null;
      const fallback: ProfileCache = {
        userId: session.user.id,
        role: matches?.role ?? null,
        fullName: matches?.fullName ?? null,
        schoolId: matches?.schoolId ?? null,
        schoolIdNo: matches?.schoolIdNo ?? null,
      };
      set({ ...fallback, loading: false });
      await writeCachedProfile(fallback);
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    await clearCachedProfile();
    set({ ...EMPTY_PROFILE });
  },
}));

supabase.auth.onAuthStateChange(() => {
  useAuthStore.getState().hydrate();
});
