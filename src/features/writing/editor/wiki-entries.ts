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

/**
 * Cụm từ Viết Hoa (2–4 chữ) xuất hiện nhiều nhưng chưa có trong wiki.
 * Tạm thời dùng cho panel bên phải; bước 2 thay bằng candidates() của Codex.
 */
export function findUnknownNames(text: string, known: Set<string>, minCount = 3): { name: string; count: number }[] {
  const re = /(?<![\p{L}\p{N}])(\p{Lu}[\p{Ll}\p{M}]*(?:\s+\p{Lu}[\p{Ll}\p{M}]*){1,3})(?![\p{L}\p{N}])/gu;
  const stats = new Map<string, { count: number; midSentence: boolean }>();
  for (const m of text.matchAll(re)) {
    const name = m[1].replace(/\s+/g, " ");
    if (known.has(name)) continue;
    const before = text.slice(Math.max(0, m.index - 3), m.index);
    const sentenceStart = m.index === 0 || /[.!?…:"“”\n]\s*$/.test(before);
    const s = stats.get(name) ?? { count: 0, midSentence: false };
    s.count++;
    s.midSentence ||= !sentenceStart;
    stats.set(name, s);
  }
  return [...stats]
    .filter(([, s]) => s.count >= minCount && s.midSentence)
    .map(([name, s]) => ({ name, count: s.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
