import type { CodexData, Entity } from "./schema";
import { TYPES, type TypeDef } from "./types";

const NEUTRAL: [string, string] = ["#7b7288", "#4a4458"];

export function allTypes(d: CodexData): TypeDef[] {
  return [...TYPES, ...d.custom];
}

export function tdef(d: CodexData, k: string): TypeDef | undefined {
  return TYPES.find((t) => t.k === k) ?? d.custom.find((t) => t.k === k);
}

/** Mục của loại k trong thời đại đang chọn (kèm mục “xuyên suốt”). */
export function listInEra(d: CodexData, k: string): Entity[] {
  return (d.ent[k] ?? []).filter((e) => !e.eraId || e.eraId === d.eraId);
}

export function elementColor(d: CodexData, id: string) {
  return d.elements.find((e) => e.id === id)?.color ?? NEUTRAL[0];
}

export function elementName(d: CodexData, id: string) {
  return d.elements.find((e) => e.id === id)?.name ?? "?";
}

/** Hai màu cho dải gradient của một mục, lấy từ các hệ của nó. */
export function entityColors(d: CodexData, els: string[]): [string, string] {
  const c = els.map((id) => elementColor(d, id));
  return c.length ? [c[0], c[1] ?? c[0]] : NEUTRAL;
}

export function entityName(d: CodexData, k: string, id: string) {
  if (k === "element") return elementName(d, id);
  return (d.ent[k] ?? []).find((e) => e.id === id)?.name ?? "(đã xóa)";
}

export function findEntity(d: CodexData, k: string, id: string) {
  return (d.ent[k] ?? []).find((e) => e.id === id);
}

/** Tên + biệt danh (ngăn bằng dấu phẩy) của một mục, bỏ trùng và chuỗi quá ngắn. */
export function entityNames(e: Entity): string[] {
  return [...new Set([e.name, ...e.aliases.split(",")].map((s) => s.trim()).filter((s) => s.length > 1))];
}

export function entityHref(k: string, id: string) {
  return `/e/${k}?open=${id}`;
}
