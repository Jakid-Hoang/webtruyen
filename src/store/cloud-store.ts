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
  set: (p: Partial<Omit<CloudState, "set">>) => void;
}

export const useCloud = create<CloudState>()((set) => ({
  status: "off",
  lastSyncAt: null,
  error: null,
  choice: null,
  set: (p) => set(p),
}));
