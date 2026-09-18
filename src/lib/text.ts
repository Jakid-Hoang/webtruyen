/** Lowercase + strip Vietnamese diacritics, for forgiving search. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

export function matches(needle: string, ...haystack: (string | undefined)[]): boolean {
  const n = fold(needle.trim());
  if (!n) return true;
  return fold(haystack.filter(Boolean).join(" ")).includes(n);
}

export const viCompare = (a: string, b: string) => a.localeCompare(b, "vi", { sensitivity: "base", numeric: true });
