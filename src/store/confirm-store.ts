"use client";

import { create } from "zustand";

interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface ConfirmState {
  request: ConfirmRequest | null;
  close: () => void;
}

export const useConfirmStore = create<ConfirmState>()((set) => ({
  request: null,
  close: () => set({ request: null }),
}));

/** Open the global confirm dialog (rendered once in the app shell). */
export function askConfirm(request: ConfirmRequest) {
  useConfirmStore.setState({ request });
}
