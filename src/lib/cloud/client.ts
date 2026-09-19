"use client";

/*
 * Kết nối Supabase (đăng nhập + đồng bộ nhiều máy).
 * Không cấu hình thì app vẫn chạy y như cũ: mọi thứ lưu trong trình duyệt.
 * Cần NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY (khóa anon là
 * khóa công khai, nằm trong mã trang; phân quyền do Row Level Security lo).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Giá trị env dán trên Windows hay dính BOM hoặc CR — cắt đi cho chắc. */
const clean = (v: string | undefined) => (v ?? "").replace(/^﻿/, "").trim();

const URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const ANON = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const cloudConfigured = Boolean(URL && ANON);

let client: SupabaseClient | null = null;

export function cloud(): SupabaseClient | null {
  if (!cloudConfigured) return null;
  client ??= createClient(URL, ANON, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

/** Thông báo lỗi của Supabase dịch sang tiếng Việt cho dễ hiểu. */
export function cloudError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Sai email hoặc mật khẩu.";
  if (m.includes("email not confirmed")) return "Email chưa được xác nhận. Kiểm tra hộp thư và bấm liên kết xác nhận.";
  if (m.includes("user already registered")) return "Email này đã có tài khoản — hãy đăng nhập.";
  if (m.includes("password should be at least")) return "Mật khẩu quá ngắn, cần ít nhất 6 ký tự.";
  if (m.includes("rate limit") || m.includes("too many")) return "Thử lại quá nhiều lần, đợi một lát rồi thử tiếp.";
  if (m.includes("failed to fetch")) return "Không kết nối được máy chủ. Kiểm tra mạng.";
  return message;
}
