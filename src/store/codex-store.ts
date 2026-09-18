"use client";

import { create } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { genId } from "@/lib/id";
import { createEntity, seedCodex, type CodexData, type Element, type Entity, type Rel } from "@/lib/codex/schema";
import { TYPES, type TypeDef } from "@/lib/codex/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Patch<T> = Partial<T> | ((x: T) => T);

interface CodexState {
  data: CodexData;
  hydrated: boolean;
  saveStatus: SaveStatus;

  setHydrated: () => void;
  setSaveStatus: (s: SaveStatus) => void;
  /** Thay toàn bộ dữ liệu (nạp file / tải lần đầu). Xóa lịch sử hoàn tác. */
  replaceData: (data: CodexData) => void;

  setWorld: (patch: Partial<CodexData["world"]>) => void;

  addElement: () => void;
  updateElement: (id: string, patch: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  toggleCounter: (a: string, b: string) => void;

  setEra: (id: string) => void;
  addEra: (name: string) => string;
  renameEra: (id: string, name: string) => void;
  /** Mục thuộc thời đại bị xóa sẽ thành “xuyên suốt”. */
  deleteEra: (id: string) => boolean;

  addEntity: (k: string, init?: Partial<Entity>) => Entity;
  updateEntity: (k: string, id: string, patch: Patch<Entity>) => void;
  /** Xóa và gỡ mọi liên kết tới nó (r, rel, recipe). */
  deleteEntity: (k: string, id: string) => void;
  setField: (k: string, id: string, field: string, value: string) => void;
  toggleEntityElement: (k: string, id: string, elementId: string) => void;
  setRefs: (k: string, id: string, refKey: string, ids: string[]) => void;
  setAffinity: (charId: string, elementId: string, value: number) => void;
  addRelation: (charId: string, rel: Rel) => void;
  removeRelation: (charId: string, index: number) => void;

  addCustomType: (def: Omit<TypeDef, "k">) => string;
  deleteCustomType: (k: string) => void;

  ignoreName: (name: string) => void;
  unignoreName: (index: number) => void;
}

function applyPatch<T>(x: T, p: Patch<T>): T {
  return typeof p === "function" ? p(x) : { ...x, ...p };
}

const initial = seedCodex();

export const useCodex = create<CodexState>()(
  temporal(
    (set, get) => {
      const update = (fn: (d: CodexData) => CodexData) => set({ data: fn(get().data) });
      const mapEnt = (d: CodexData, k: string, fn: (list: Entity[]) => Entity[]): CodexData => ({
        ...d,
        ent: { ...d.ent, [k]: fn(d.ent[k] ?? []) },
      });
      const mapAllEnt = (d: CodexData, fn: (e: Entity) => Entity): CodexData => ({
        ...d,
        ent: Object.fromEntries(Object.entries(d.ent).map(([k, list]) => [k, list.map(fn)])),
      });

      return {
        data: initial,
        hydrated: false,
        saveStatus: "idle",

        setHydrated: () => set({ hydrated: true }),
        setSaveStatus: (saveStatus) => set({ saveStatus }),
        replaceData: (data) => {
          set({ data });
          useCodex.temporal.getState().clear();
        },

        setWorld: (patch) => update((d) => ({ ...d, world: { ...d.world, ...patch } })),

        addElement: () =>
          update((d) => ({ ...d, elements: [...d.elements, { id: genId("el"), name: "Hệ mới", icon: "✦", color: "#7b7288", desc: "" }] })),
        updateElement: (id, patch) =>
          update((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
        deleteElement: (id) =>
          update((d) =>
            mapAllEnt(
              {
                ...d,
                elements: d.elements.filter((e) => e.id !== id),
                counters: d.counters.filter(([a, b]) => a !== id && b !== id),
              },
              (e) => {
                const aff = { ...e.aff };
                delete aff[id];
                const r = Object.fromEntries(Object.entries(e.r).map(([rk, ids]) => [rk, ids.filter((x) => x !== id)]));
                return { ...e, els: e.els.filter((x) => x !== id), aff, r };
              },
            ),
          ),
        toggleCounter: (a, b) =>
          update((d) => {
            const on = d.counters.some(([x, y]) => x === a && y === b);
            return { ...d, counters: on ? d.counters.filter(([x, y]) => !(x === a && y === b)) : [...d.counters, [a, b]] };
          }),

        setEra: (eraId) => update((d) => ({ ...d, eraId })),
        addEra: (name) => {
          const id = genId("era");
          update((d) => ({ ...d, eras: [...d.eras, { id, name, note: "" }], eraId: id }));
          return id;
        },
        renameEra: (id, name) => update((d) => ({ ...d, eras: d.eras.map((e) => (e.id === id ? { ...e, name } : e)) })),
        deleteEra: (id) => {
          const d = get().data;
          if (d.eras.length < 2) return false;
          update((x) => {
            const eras = x.eras.filter((e) => e.id !== id);
            return mapAllEnt({ ...x, eras, eraId: x.eraId === id ? eras[0].id : x.eraId }, (e) =>
              e.eraId === id ? { ...e, eraId: null } : e,
            );
          });
          return true;
        },

        addEntity: (k, init = {}) => {
          const d = get().data;
          const t = [...TYPES, ...d.custom].find((x) => x.k === k);
          const e = createEntity(d.eraId, { name: t ? `${t.l} mới` : "Mục mới", icon: t?.ic ?? "", ...init });
          update((x) => mapEnt(x, k, (list) => [...list, e]));
          return e;
        },
        updateEntity: (k, id, patch) =>
          update((d) => mapEnt(d, k, (list) => list.map((e) => (e.id === id ? applyPatch(e, patch) : e)))),
        deleteEntity: (k, id) =>
          update((d) =>
            mapAllEnt(
              mapEnt(d, k, (list) => list.filter((e) => e.id !== id)),
              (e) => ({
                ...e,
                r: Object.fromEntries(Object.entries(e.r).map(([rk, ids]) => [rk, ids.filter((x) => x !== id)])),
                rel: e.rel.filter((r) => r.to !== id),
                recipe: e.recipe?.filter((x) => x !== id),
              }),
            ),
          ),
        setField: (k, id, field, value) => get().updateEntity(k, id, (e) => ({ ...e, f: { ...e.f, [field]: value } })),
        toggleEntityElement: (k, id, elementId) =>
          get().updateEntity(k, id, (e) => ({
            ...e,
            els: e.els.includes(elementId) ? e.els.filter((x) => x !== elementId) : [...e.els, elementId],
          })),
        setRefs: (k, id, refKey, ids) => get().updateEntity(k, id, (e) => ({ ...e, r: { ...e.r, [refKey]: ids } })),
        setAffinity: (charId, elementId, value) =>
          get().updateEntity("char", charId, (e) => ({ ...e, aff: { ...e.aff, [elementId]: value } })),
        addRelation: (charId, rel) => get().updateEntity("char", charId, (e) => ({ ...e, rel: [...e.rel, rel] })),
        removeRelation: (charId, index) =>
          get().updateEntity("char", charId, (e) => ({ ...e, rel: e.rel.filter((_, i) => i !== index) })),

        addCustomType: (def) => {
          const k = `cu${genId()}`;
          update((d) => ({ ...d, custom: [...d.custom, { ...def, k }], ent: { ...d.ent, [k]: [] } }));
          return k;
        },
        deleteCustomType: (k) =>
          update((d) => {
            const ent = { ...d.ent };
            delete ent[k];
            return { ...d, custom: d.custom.filter((t) => t.k !== k), ent };
          }),

        ignoreName: (name) => update((d) => ({ ...d, ignore: [...d.ignore, name] })),
        unignoreName: (index) => update((d) => ({ ...d, ignore: d.ignore.filter((_, i) => i !== index) })),
      };
    },
    {
      limit: 50,
      partialize: (s) => ({ data: s.data }),
      equality: (a, b) => a.data === b.data,
    },
  ),
);

type HistoryState = TemporalState<{ data: CodexData }>;
export function useHistory<T>(selector: (s: HistoryState) => T): T {
  return useStoreWithEqualityFn(useCodex.temporal, selector);
}
