"use client";

import { SelectField } from "@/components/kit/fields";
import { FACTION_CATEGORIES, getFactionCategory } from "@/lib/catalog";
import type { Faction } from "@/lib/schema/world";

export function factionLabel(f: Faction) {
  const cat = getFactionCategory(f.factionCategory);
  const rank = cat?.ranks.find((r) => r.value === f.factionRank);
  if (rank) return `${rank.icon} ${rank.label}`;
  if (cat) return `${cat.icon} ${cat.label}`;
  return f.factionCategory || "Chưa phân loại";
}

export function factionIcon(f: Faction) {
  return getFactionCategory(f.factionCategory)?.icon ?? "🛡️";
}

/** Category + rank selects. Changing category clears a rank that no longer applies. */
export function FactionClassFields({ faction, onChange }: { faction: Faction; onChange: (patch: Partial<Faction>) => void }) {
  const cat = getFactionCategory(faction.factionCategory);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <SelectField
        label="Phân loại"
        value={faction.factionCategory}
        onChange={(factionCategory) => {
          const next = getFactionCategory(factionCategory);
          const keepRank = next?.ranks.some((r) => r.value === faction.factionRank);
          onChange({ factionCategory, factionRank: keepRank ? faction.factionRank : "" });
        }}
        options={FACTION_CATEGORIES}
        placeholder="— Chưa phân loại —"
      />
      {cat && cat.ranks.length > 0 && (
        <SelectField
          label="Đẳng cấp"
          value={faction.factionRank}
          onChange={(factionRank) => onChange({ factionRank })}
          options={cat.ranks}
          placeholder="— Chưa xác định —"
        />
      )}
    </div>
  );
}
