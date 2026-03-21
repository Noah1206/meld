import { create } from "zustand";

interface AuthUser {
  id: string;
  githubUsername: string;
  email: string | null;
  avatarUrl: string | null;
  hasFigmaToken: boolean;
  plan: "free" | "pro" | "team";
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  fetchUser: async () => {
    try {
      set({ loading: true });
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        set({ user: null, loading: false });
        return;
      }
      const data = await res.json();
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
    window.location.href = "/login";
  },
}));
