"use client";

import { create } from "zustand";

export type CloudStatus = "off" | "idle" | "syncing" | "synced" | "error";

export interface CloudChoice {
  remoteName: string;
  remoteCount: number;
  localCount: number;
}

interface CloudState {
  status: CloudStatus;
  lastSyncAt: number | null;
  error: string | null;
  /** Hai bên khác nhau — chờ người dùng chọn giữ bản nào. */
  choice: CloudChoice | null;
  /** Máy chủ thiếu cột của v1.6: phần truyện và tóm tắt chưa đồng bộ được. */
  schemaOutdated: boolean;
  set: (p: Partial<Omit<CloudState, "set">>) => void;
}

export const useCloud = create<CloudState>()((set) => ({
  status: "off",
  lastSyncAt: null,
  error: null,
  choice: null,
  schemaOutdated: false,
  set: (p) => set(p),
}));
