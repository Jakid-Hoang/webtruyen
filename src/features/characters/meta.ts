import { GENDERS } from "@/lib/catalog";
import type { Character, CharacterStatus } from "@/lib/schema/world";

export const STATUS_META: Record<CharacterStatus, { label: string; symbol: string; dot: string; className: string }> = {
  alive: {
    label: "Còn sống",
    symbol: "●",
    dot: "bg-emerald-500",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  dead: {
    label: "Tử vong",
    symbol: "✕",
    dot: "bg-rose-500",
    className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  hidden: {
    label: "Ẩn cư",
    symbol: "◎",
    dot: "bg-amber-500",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

export const genderLabel = (g: string) => GENDERS.find((x) => x.value === g)?.label ?? g;

export function defaultAccent(c: Character) {
  if (c.cardAccent) return c.cardAccent;
  if (c.status === "dead") return "#dc2626";
  if (c.status === "hidden") return "#d97706";
  return "#3b82f6";
}

/** Visual treatment per card theme: background + corner ornament. */
export const THEME_STYLE: Record<string, { bg: string; ornament: string }> = {
  classic: { bg: "linear-gradient(160deg, color-mix(in oklch, var(--accent-c) 18%, transparent), transparent 60%)", ornament: "❖" },
  cat: { bg: "radial-gradient(circle at 80% 10%, color-mix(in oklch, var(--accent-c) 25%, transparent), transparent 55%)", ornament: "🐾" },
  dog: { bg: "radial-gradient(circle at 20% 10%, color-mix(in oklch, var(--accent-c) 25%, transparent), transparent 55%)", ornament: "🦴" },
  floral: { bg: "linear-gradient(135deg, color-mix(in oklch, #ec4899 16%, transparent), color-mix(in oklch, var(--accent-c) 14%, transparent))", ornament: "🌸" },
  dark: { bg: "linear-gradient(180deg, rgba(0,0,0,0.35), color-mix(in oklch, var(--accent-c) 12%, transparent))", ornament: "☾" },
  celestial: { bg: "radial-gradient(ellipse at top, color-mix(in oklch, #6366f1 25%, transparent), transparent 65%)", ornament: "✦" },
  dragon: { bg: "linear-gradient(160deg, color-mix(in oklch, #f59e0b 20%, transparent), color-mix(in oklch, var(--accent-c) 12%, transparent))", ornament: "🐉" },
  ghost: { bg: "linear-gradient(180deg, color-mix(in oklch, #94a3b8 18%, transparent), transparent 70%)", ornament: "👻" },
};
