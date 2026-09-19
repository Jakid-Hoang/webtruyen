"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { cloud, cloudConfigured, cloudError } from "@/lib/cloud/client";

type AuthStatus = "loading" | "signed-out" | "signed-in";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** Đăng ký xong mà Supabase bắt xác nhận email thì hiện lời nhắc này. */
  notice: string | null;
  setNotice: (n: string | null) => void;
  /** Theo dõi phiên đăng nhập; gọi một lần khi app khởi động. */
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  status: cloudConfigured ? "loading" : "signed-out",
  user: null,
  notice: null,

  setNotice: (notice) => set({ notice }),

  init: () => {
    const db = cloud();
    if (!db) {
      set({ status: "signed-out", user: null });
      return () => {};
    }
    void db.auth.getSession().then(({ data }) => {
      set({ status: data.session ? "signed-in" : "signed-out", user: data.session?.user ?? null });
    });
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      set({ status: session ? "signed-in" : "signed-out", user: session?.user ?? null });
    });
    return () => data.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    const db = cloud();
    if (!db) return "Chưa cấu hình Supabase.";
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    return error ? cloudError(error.message) : null;
  },

  signUp: async (email, password) => {
    const db = cloud();
    if (!db) return "Chưa cấu hình Supabase.";
    const { data, error } = await db.auth.signUp({ email: email.trim(), password });
    if (error) return cloudError(error.message);
    if (!data.session) set({ notice: "Đã gửi thư xác nhận. Mở hộp thư, bấm liên kết trong thư rồi quay lại đăng nhập." });
    return null;
  },

  signOut: async () => {
    await cloud()?.auth.signOut();
    set({ status: "signed-out", user: null });
  },
}));
