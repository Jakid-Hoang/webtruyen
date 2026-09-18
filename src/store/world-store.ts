"use client";

import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { inverseRelationType } from "@/lib/catalog";
import { genId } from "@/lib/id";
import { createSampleWorld } from "@/lib/sample-data";
import {
  createEmptyEra,
  type Era,
  type EraCollectionKey,
  type EraItem,
  type Faction,
  type Location,
  type Relationship,
  type WorldData,
} from "@/lib/schema/world";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Patch<T> = Partial<T> | ((item: T) => T);

interface WorldState {
  data: WorldData;
  activeEraId: string;
  hydrated: boolean;
  saveStatus: SaveStatus;

  setHydrated: () => void;
  setSaveStatus: (s: SaveStatus) => void;
  /** Replace the whole document (load/import). Clears undo history. */
  replaceData: (data: WorldData) => void;
  setActiveEra: (eraId: string) => void;
  /** Escape hatch for multi-collection edits (e.g. AI extract). One undo step. */
  updateEra: (fn: (era: Era) => Era) => void;

  addEra: (name: string, copyWorldFromEraId?: string) => void;
  renameEra: (eraId: string, name: string) => void;
  deleteEra: (eraId: string) => boolean;

  addItem: <K extends EraCollectionKey>(key: K, item: EraItem<K>, position?: "start" | "end") => void;
  updateItem: <K extends EraCollectionKey>(key: K, id: string, patch: Patch<EraItem<K>>) => void;
  /** Delete entities and scrub every reference to them elsewhere in the era. */
  deleteItems: (key: EraCollectionKey, ids: string[]) => void;

  addFaction: (locId: string, faction: Faction) => void;
  updateFaction: (factionId: string, patch: Partial<Faction>) => void;
  deleteFactions: (factionIds: string[]) => void;

  /** Create or update a relationship on `charId` and mirror its inverse on the target. */
  saveRelationship: (charId: string, rel: Relationship) => void;
  deleteRelationship: (charId: string, relId: string) => void;
}

function applyPatch<T>(item: T, patch: Patch<T>): T {
  return typeof patch === "function" ? patch(item) : { ...item, ...patch };
}

/** Remove references to deleted ids across the era so nothing dangles. */
function scrubReferences(era: Era, key: EraCollectionKey, ids: Set<string>): Era {
  const without = (arr: string[]) => arr.filter((x) => !ids.has(x));
  const clear = (v: string) => (ids.has(v) ? "" : v);

  switch (key) {
    case "characters":
      return {
        ...era,
        characters: era.characters.map((c) => ({
          ...c,
          relationships: c.relationships.filter((r) => !ids.has(r.targetId)),
        })),
        cultivationArts: era.cultivationArts.map((a) => ({
          ...a,
          ownerIds: without(a.ownerIds),
          charData: Object.fromEntries(Object.entries(a.charData).filter(([cid]) => !ids.has(cid))),
        })),
        skills: era.skills.map((s) => ({ ...s, ownerIds: without(s.ownerIds) })),
        treasures: era.treasures.map((t) => ({ ...t, ownerId: clear(t.ownerId) })),
        domains: era.domains.map((d) => ({ ...d, ownerId: clear(d.ownerId) })),
        flames: era.flames.map((f) => ({ ...f, ownerId: clear(f.ownerId) })),
        pills: era.pills.map((p) => ({ ...p, ownerId: clear(p.ownerId), refineBy: clear(p.refineBy) })),
      };
    case "worldStructure": {
      const factionIds = new Set(
        era.worldStructure.filter((l) => ids.has(l.id)).flatMap((l) => l.factions.map((f) => f.id)),
      );
      return {
        ...era,
        characters: era.characters.map((c) =>
          ids.has(c.locationId) || factionIds.has(c.factionId)
            ? { ...c, locationId: clear(c.locationId), factionId: factionIds.has(c.factionId) ? "" : c.factionId }
            : c,
        ),
      };
    }
    case "ingredients":
      return { ...era, recipes: era.recipes.map((r) => ({ ...r, ingredientIds: without(r.ingredientIds) })) };
    case "recipes":
      return { ...era, pills: era.pills.map((p) => ({ ...p, recipeId: clear(p.recipeId) })) };
    case "races":
      return { ...era, characters: era.characters.map((c) => ({ ...c, raceId: clear(c.raceId) })) };
    default:
      return era;
  }
}

function copyWorldStructure(locs: Location[]): Location[] {
  return locs.map((l) => ({
    ...structuredClone(l),
    id: genId("l"),
    factions: l.factions.map((f) => ({ ...structuredClone(f), id: genId("f") })),
  }));
}

const initial = createSampleWorld();

export const useWorldStore = create<WorldState>()(
  temporal(
    (set, get) => {
      const updateActiveEra = (fn: (era: Era) => Era) => {
        const { data, activeEraId } = get();
        set({ data: { ...data, eras: data.eras.map((e) => (e.id === activeEraId ? fn(e) : e)) } });
      };

      const mapCollection = <K extends EraCollectionKey>(era: Era, key: K, fn: (arr: EraItem<K>[]) => EraItem<K>[]): Era => ({
        ...era,
        [key]: fn(era[key] as EraItem<K>[]),
      });

      return {
        data: initial,
        activeEraId: initial.eras[0].id,
        hydrated: false,
        saveStatus: "idle",

        setHydrated: () => set({ hydrated: true }),
        setSaveStatus: (saveStatus) => set({ saveStatus }),

        replaceData: (data) => {
          set({ data, activeEraId: data.eras[0].id });
          useWorldStore.temporal.getState().clear();
        },

        setActiveEra: (activeEraId) => set({ activeEraId }),
        updateEra: updateActiveEra,

        addEra: (name, copyWorldFromEraId) => {
          const { data } = get();
          const era = createEmptyEra(name);
          const source = copyWorldFromEraId && data.eras.find((e) => e.id === copyWorldFromEraId);
          if (source) era.worldStructure = copyWorldStructure(source.worldStructure);
          set({ data: { ...data, eras: [...data.eras, era] }, activeEraId: era.id });
        },

        renameEra: (eraId, name) => {
          const { data } = get();
          set({ data: { ...data, eras: data.eras.map((e) => (e.id === eraId ? { ...e, name } : e)) } });
        },

        deleteEra: (eraId) => {
          const { data, activeEraId } = get();
          if (data.eras.length <= 1) return false;
          const eras = data.eras.filter((e) => e.id !== eraId);
          set({ data: { ...data, eras }, activeEraId: activeEraId === eraId ? eras[0].id : activeEraId });
          return true;
        },

        addItem: (key, item, position = "end") =>
          updateActiveEra((era) => mapCollection(era, key, (arr) => (position === "start" ? [item, ...arr] : [...arr, item]))),

        updateItem: (key, id, patch) =>
          updateActiveEra((era) =>
            mapCollection(era, key, (arr) => arr.map((x) => ((x as { id: string }).id === id ? applyPatch(x, patch) : x))),
          ),

        deleteItems: (key, ids) => {
          if (ids.length === 0) return;
          const idSet = new Set(ids);
          updateActiveEra((era) =>
            scrubReferences(
              mapCollection(era, key, (arr) => arr.filter((x) => !idSet.has((x as { id: string }).id))),
              key,
              idSet,
            ),
          );
        },

        addFaction: (locId, faction) =>
          updateActiveEra((era) => ({
            ...era,
            worldStructure: era.worldStructure.map((l) => (l.id === locId ? { ...l, factions: [...l.factions, faction] } : l)),
          })),

        updateFaction: (factionId, patch) =>
          updateActiveEra((era) => ({
            ...era,
            worldStructure: era.worldStructure.map((l) =>
              l.factions.some((f) => f.id === factionId)
                ? { ...l, factions: l.factions.map((f) => (f.id === factionId ? { ...f, ...patch } : f)) }
                : l,
            ),
          })),

        deleteFactions: (factionIds) => {
          const idSet = new Set(factionIds);
          updateActiveEra((era) => ({
            ...era,
            worldStructure: era.worldStructure.map((l) => ({ ...l, factions: l.factions.filter((f) => !idSet.has(f.id)) })),
            characters: era.characters.map((c) => (idSet.has(c.factionId) ? { ...c, factionId: "" } : c)),
          }));
        },

        saveRelationship: (charId, rel) =>
          updateActiveEra((era) => {
            const owner = era.characters.find((c) => c.id === charId);
            if (!owner) return era;
            const previous = owner.relationships.find((r) => r.id === rel.id);
            const exists = !!previous;

            return {
              ...era,
              characters: era.characters.map((c) => {
                if (c.id === charId) {
                  return {
                    ...c,
                    relationships: exists
                      ? c.relationships.map((r) => (r.id === rel.id ? rel : r))
                      : [...c.relationships, rel],
                  };
                }
                let rels = c.relationships;
                // Target changed or group changed: drop the old mirror.
                if (previous?.targetId && c.id === previous.targetId && (previous.targetId !== rel.targetId || previous.group !== rel.group)) {
                  rels = rels.filter((r) => !(r.targetId === charId && r.group === previous.group));
                }
                // Mirror the (complete) relation onto its target, replacing any existing mirror in that group.
                if (rel.targetId && rel.type && c.id === rel.targetId && rel.targetId !== charId) {
                  const mirror = rels.find((r) => r.targetId === charId && r.group === rel.group);
                  rels = [
                    ...rels.filter((r) => !(r.targetId === charId && r.group === rel.group)),
                    {
                      id: mirror?.id ?? genId("r"),
                      targetId: charId,
                      group: rel.group,
                      type: inverseRelationType(rel.group, rel.type),
                      description: rel.description,
                    },
                  ];
                }
                return rels === c.relationships ? c : { ...c, relationships: rels };
              }),
            };
          }),

        deleteRelationship: (charId, relId) =>
          updateActiveEra((era) => {
            const rel = era.characters.find((c) => c.id === charId)?.relationships.find((r) => r.id === relId);
            if (!rel) return era;
            return {
              ...era,
              characters: era.characters.map((c) => {
                if (c.id === charId) return { ...c, relationships: c.relationships.filter((r) => r.id !== relId) };
                if (c.id === rel.targetId) {
                  return { ...c, relationships: c.relationships.filter((r) => !(r.targetId === charId && r.group === rel.group)) };
                }
                return c;
              }),
            };
          }),
      };
    },
    {
      limit: 50,
      // Only the document is undoable; UI/session fields are not.
      partialize: (state) => ({ data: state.data }),
      equality: (a, b) => a.data === b.data,
    },
  ),
);

type HistoryState = TemporalState<{ data: WorldData }>;

export function useHistory<T>(selector: (s: HistoryState) => T): T {
  return useStoreWithEqualityFn(useWorldStore.temporal, selector);
}

export function useActiveEra(): Era {
  return useWorldStore((s) => s.data.eras.find((e) => e.id === s.activeEraId) ?? s.data.eras[0]);
}
