/** Short random id, optionally prefixed by entity type (e.g. "c-3f9a1b2c4d5e"). */
export function genId(prefix = ""): string {
  const raw = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return prefix ? `${prefix}-${raw}` : raw;
}
