"use client";

import { useMemo } from "react";
import { MENTION_KINDS, type MentionKind } from "@/lib/writing/schema";
import { useActiveEra } from "@/store/world-store";

export interface WikiEntry {
  kind: MentionKind;
  id: string;
  name: string;
  sub?: string;
}

/** Every mentionable/highlightable wiki entity of the active era. */
export function useWikiEntries(): WikiEntry[] {
  const era = useActiveEra();
  return useMemo(() => {
    const out: WikiEntry[] = [];
    const push = (kind: MentionKind, id: string, name: string, sub?: string) => name.trim() && out.push({ kind, id, name: name.trim(), sub });
    for (const c of era.characters) {
      push("c", c.id, c.name, c.cultivation);
      if (c.nickname) push("c", c.id, c.nickname, `Biệt danh của ${c.name}`);
    }
    for (const l of era.worldStructure) {
      push("l", l.id, l.name);
      for (const f of l.factions) push("f", f.id, f.name, l.name);
    }
    for (const a of era.cultivationArts) push("a", a.id, a.name, a.rank);
    for (const t of era.treasures) push("t", t.id, t.name, t.rank);
    for (const s of era.skills) push("s", s.id, s.name, s.rank);
    for (const r of era.races) push("r", r.id, r.name, r.alias);
    return out;
  }, [era]);
}

export const kindMeta = (k: MentionKind) => MENTION_KINDS[k];

/**
 * Capitalised multi-word sequences (likely proper names) that appear often but
 * are not in the wiki. Heuristic: 2–4 Capitalised words, ≥3 occurrences, and at
 * least one occurrence not at the start of a sentence.
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
