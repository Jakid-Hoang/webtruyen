import {
  BarChart3,
  BookOpen,
  Dna,
  Flame,
  Globe2,
  Link2,
  Mountain,
  PenLine,
  Shield,
  Sparkles,
  Sword,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const VIEWS = [
  { key: "characters", label: "Nhân Vật", icon: Users },
  { key: "factions", label: "Thế Lực", icon: Shield },
  { key: "world", label: "Thế Giới", icon: Globe2 },
  { key: "arts", label: "Công Pháp", icon: BookOpen },
  { key: "treasures", label: "Pháp Bảo", icon: Sword },
  { key: "skills", label: "Thần Thông", icon: Zap },
  { key: "domains", label: "Lĩnh Vực", icon: Sparkles },
  { key: "relations", label: "Quan Hệ", icon: Link2 },
  { key: "pills", label: "Đan Dược", icon: Flame },
  { key: "realms", label: "Cảnh Giới", icon: Mountain },
  { key: "races", label: "Chủng Tộc", icon: Dna },
  { key: "stats", label: "Thống Kê", icon: BarChart3 },
] as const satisfies readonly { key: string; label: string; icon: LucideIcon }[];

export type ViewKey = (typeof VIEWS)[number]["key"];

/** Every sidebar / bottom-nav entry: the writing studio first, then wiki views. */
export const NAV_LINKS: { key: string; href: string; label: string; icon: LucideIcon }[] = [
  { key: "write", href: "/write", label: "Viết Truyện", icon: PenLine },
  ...VIEWS.map((v) => ({ key: v.key, href: `/${v.key}`, label: v.label, icon: v.icon })),
];

export function isViewKey(value: string): value is ViewKey {
  return VIEWS.some((v) => v.key === value);
}

export function getView(key: ViewKey) {
  return VIEWS.find((v) => v.key === key)!;
}
