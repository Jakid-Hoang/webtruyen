"use client";

import type { ViewKey } from "@/lib/nav";
import { AlchemyView } from "@/features/alchemy/alchemy-view";
import { CharactersView } from "@/features/characters/characters-view";
import { ArtsView, DomainsView, SkillsView, TreasuresView } from "@/features/items/item-views";
import { RacesView } from "@/features/races/races-view";
import { RealmsView } from "@/features/realms/realms-view";
import { RelationsView } from "@/features/relations/relations-view";
import { StatsView } from "@/features/stats/stats-view";
import { FactionsView } from "@/features/world/factions-view";
import { WorldView } from "@/features/world/world-view";

const VIEWS: Record<ViewKey, React.ComponentType> = {
  characters: CharactersView,
  factions: FactionsView,
  world: WorldView,
  arts: ArtsView,
  treasures: TreasuresView,
  skills: SkillsView,
  domains: DomainsView,
  relations: RelationsView,
  pills: AlchemyView,
  realms: RealmsView,
  races: RacesView,
  stats: StatsView,
};

export function ViewRenderer({ view }: { view: ViewKey }) {
  const View = VIEWS[view];
  return <View />;
}
