import type { CodexData } from "@/lib/codex/schema";
import { allTypes } from "@/lib/codex/select";
import { GROUPS } from "@/lib/codex/types";

export interface NavItem {
  /** Khóa dùng để đánh dấu mục đang mở (loại mục, hoặc tên trang). */
  key: string;
  href: string;
  label: string;
  icon: string;
  count?: number;
}

/** Trang không phải loại mục, gắn vào nhóm sidebar. */
const PAGES: (NavItem & { group: (typeof GROUPS)[number] })[] = [
  { key: "world", href: "/world", label: "Thế giới & hệ", icon: "🜁", group: "Nền tảng" },
  { key: "write", href: "/write", label: "Viết truyện", icon: "✍", group: "Sáng tác" },
  { key: "read", href: "/read", label: "Đọc & kiểm tra", icon: "📖", group: "Sáng tác" },
  { key: "scan", href: "/scan", label: "Dò tên lạ", icon: "🔍", group: "Sáng tác" },
  { key: "library", href: "/library/skill", label: "Thư viện mẫu", icon: "📚", group: "Sức mạnh" },
  { key: "fuse", href: "/fuse", label: "Kết hợp skill", icon: "⚗", group: "Sức mạnh" },
  { key: "stats", href: "/stats", label: "Thống kê", icon: "📊", group: "Ghi chép" },
  { key: "types", href: "/types", label: "Thêm loại mục…", icon: "＋", group: "Khác" },
];

/** Sidebar chia nhóm, sinh từ TYPES + loại mục tự tạo (không viết cứng từng trang). */
export function buildNav(d: CodexData): { group: string; items: NavItem[] }[] {
  const groups = new Map<string, NavItem[]>(GROUPS.map((g) => [g, []]));
  for (const p of PAGES.filter((p) => p.group === "Nền tảng")) groups.get(p.group)!.push(p);
  for (const t of allTypes(d)) {
    const g = groups.has(t.g) ? t.g : "Khác";
    groups.get(g)!.push({ key: t.k, href: `/e/${t.k}`, label: t.l, icon: t.ic, count: (d.ent[t.k] ?? []).length });
  }
  for (const p of PAGES.filter((p) => p.group !== "Nền tảng")) groups.get(p.group)!.push(p);
  return [...groups].filter(([, items]) => items.length).map(([group, items]) => ({ group, items }));
}

/** Khóa mục đang mở, suy từ đường dẫn: /e/char → "char", /world → "world". */
export function activeKey(pathname: string): string {
  const [first, second] = pathname.split("/").filter(Boolean);
  return first === "e" ? (second ?? "") : (first ?? "");
}
