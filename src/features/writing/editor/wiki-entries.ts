"use client";

import { useMemo } from "react";
import { allTypes } from "@/lib/codex/select";
import { useCodex } from "@/store/codex-store";

export interface WikiEntry {
  /** Khóa loại mục (char, skill, land…). */
  kind: string;
  id: string;
  /** Tên hoặc một biệt danh — mỗi cách gọi là một entry riêng để dò. */
  name: string;
  /** Tên chính (khi `name` là biệt danh). */
  canonical: string;
  icon: string;
  typeLabel: string;
  sub?: string;
}

/** Mọi mục trong wiki có thể @chèn / tô sáng: tên + từng biệt danh. */
export function useWikiEntries(): WikiEntry[] {
  const data = useCodex((s) => s.data);
  return useMemo(() => {
    const out: WikiEntry[] = [];
    for (const t of allTypes(data))
      for (const e of data.ent[t.k] ?? []) {
        const base = { kind: t.k, id: e.id, canonical: e.name, icon: e.icon || t.ic, typeLabel: t.l };
        const names = [e.name, ...e.aliases.split(",")].map((s) => s.trim()).filter((s) => s.length > 1);
        for (const n of new Set(names)) out.push({ ...base, name: n, sub: n === e.name ? e.aliases || undefined : `Biệt danh của ${e.name}` });
      }
    return out;
  }, [data]);
}
