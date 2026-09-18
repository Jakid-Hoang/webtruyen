"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { viewHref } from "@/hooks/use-url-state";
import type { ViewKey } from "@/lib/nav";
import { viCompare } from "@/lib/text";
import type { Era } from "@/lib/schema/world";
import { useActiveEra } from "@/store/world-store";

export interface Lookups {
  era: Era;
  charName: (id: string) => string | undefined;
  characterOptions: { value: string; label: string }[];
  locationName: (id: string) => string | undefined;
  factionName: (id: string) => string | undefined;
  factionLocation: Map<string, string>;
  raceById: Map<string, Era["races"][number]>;
}

/** Id → name maps for the active era, memoized. */
export function useLookups(): Lookups {
  const era = useActiveEra();
  return useMemo(() => {
    const chars = new Map(era.characters.map((c) => [c.id, c.name]));
    const locs = new Map(era.worldStructure.map((l) => [l.id, l.name]));
    const facs = new Map<string, string>();
    const factionLocation = new Map<string, string>();
    for (const l of era.worldStructure)
      for (const f of l.factions) {
        facs.set(f.id, f.name);
        factionLocation.set(f.id, l.id);
      }
    return {
      era,
      charName: (id) => chars.get(id),
      characterOptions: era.characters
        .map((c) => ({ value: c.id, label: c.name }))
        .sort((a, b) => viCompare(a.label, b.label)),
      locationName: (id) => locs.get(id),
      factionName: (id) => facs.get(id),
      factionLocation,
      raceById: new Map(era.races.map((r) => [r.id, r])),
    };
  }, [era]);
}

/** Cross-view navigation (deep links via query params). */
export function useNav() {
  const router = useRouter();
  return useMemo(
    () => ({
      to: (view: ViewKey, params: Record<string, string | undefined> = {}) => router.push(viewHref(view, params)),
      character: (name: string) => router.push(viewHref("characters", { q: name })),
      characterById: (id: string) => router.push(viewHref("characters", { open: id })),
      location: (id: string) => router.push(viewHref("world", { open: id })),
      faction: (id: string) => router.push(viewHref("factions", { open: id })),
      relations: (charId: string) => router.push(viewHref("relations", { char: charId })),
      realm: (psId: string, mrId?: string) => router.push(viewHref("realms", { ps: psId, open: mrId })),
      race: (id: string) => router.push(viewHref("races", { open: id })),
      item: (view: ViewKey, id: string, extra: Record<string, string> = {}) => router.push(viewHref(view, { open: id, ...extra })),
    }),
    [router],
  );
}
