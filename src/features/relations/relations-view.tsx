"use client";

import { useMemo, useState } from "react";
import { Link2, List, Network, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, SearchBox } from "@/components/kit/page";
import { useNav } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import { RELATION_CATALOG } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { matches } from "@/lib/text";
import type { Character, Relationship } from "@/lib/schema/world";
import { useActiveEra } from "@/store/world-store";
import { STATUS_META } from "@/features/characters/meta";

const STATUS_HEX = { alive: "#22c55e", dead: "#ef4444", hidden: "#eab308" } as const;

const validRels = (c: Character) => c.relationships.filter((r) => r.targetId && r.type);

type Edge = { rel: Relationship; target: Character };

function RelationGraph({ center, edges, onSelect }: { center: Character; edges: Edge[]; onSelect: (id: string) => void }) {
  const n = edges.length;
  const radius = Math.min(36, Math.max(28, 10 + 2.5 * n));
  const nodes = edges.map((e, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(n, 1);
    return { ...e, x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
  });
  const trunc = (s: string, len: number) => (s.length > len ? `${s.slice(0, len)}…` : s);
  const color = (g: string) => RELATION_CATALOG.find((x) => x.key === g)?.color ?? "#71717a";

  return (
    <div className="rounded-xl border bg-card p-2">
      <svg viewBox="0 0 100 100" className="mx-auto aspect-square w-full max-w-2xl" role="img" aria-label={`Sơ đồ quan hệ của ${center.name}`}>
        {nodes.map((nd) => (
          <g key={nd.rel.id}>
            <line x1={50} y1={50} x2={nd.x} y2={nd.y} stroke={color(nd.rel.group)} strokeWidth={0.35} strokeDasharray="1.2 0.8" />
            <text
              x={(50 + nd.x) / 2}
              y={(50 + nd.y) / 2 - 0.8}
              textAnchor="middle"
              fontSize={1.9}
              fill={color(nd.rel.group)}
              className="font-semibold"
              paintOrder="stroke"
              stroke="var(--color-card)"
              strokeWidth={0.6}
            >
              {trunc(nd.rel.type, 18)}
            </text>
          </g>
        ))}
        {nodes.map((nd) => (
          <g key={`n-${nd.rel.id}`} className="cursor-pointer" onClick={() => onSelect(nd.target.id)}>
            <title>{nd.target.name}</title>
            <circle cx={nd.x} cy={nd.y} r={5} fill="var(--color-card)" stroke={color(nd.rel.group)} strokeWidth={0.5} />
            <text x={nd.x} y={nd.y + 0.8} textAnchor="middle" fontSize={2.2} fill="currentColor" className="font-semibold">
              {trunc(nd.target.name, 6)}
            </text>
            <circle cx={nd.x + 3.6} cy={nd.y - 3.6} r={0.9} fill={STATUS_HEX[nd.target.status]} />
          </g>
        ))}
        <circle cx={50} cy={50} r={8} fill="var(--color-primary)" />
        <text x={50} y={51} textAnchor="middle" fontSize={2.6} fill="var(--color-primary-foreground)" className="font-bold">
          {trunc(center.name, 8)}
        </text>
        <circle cx={55.8} cy={44.2} r={1.1} fill={STATUS_HEX[center.status]} />
      </svg>
      <div className="flex flex-wrap justify-center gap-3 pb-2 text-xs text-muted-foreground">
        {RELATION_CATALOG.map((g) => (
          <span key={g.key} className="flex items-center gap-1">
            <span className="h-0.5 w-4" style={{ background: g.color }} /> {g.label}
          </span>
        ))}
        <span>· Nhấp vào một nút để xem quan hệ của nhân vật đó</span>
      </div>
    </div>
  );
}

export function RelationsView() {
  const era = useActiveEra();
  const nav = useNav();
  const [charId, setCharId] = useUrlState("char");
  const [mode, setMode] = useUrlState("mode", "list");
  const [search, setSearch] = useState("");

  const byId = useMemo(() => new Map(era.characters.map((c) => [c.id, c])), [era.characters]);
  const center = byId.get(charId);
  const edges: Edge[] = center
    ? validRels(center).flatMap((rel) => {
        const target = byId.get(rel.targetId);
        return target ? [{ rel, target }] : [];
      })
    : [];
  const total = Math.round(era.characters.reduce((n, c) => n + validRels(c).length, 0) / 2);

  const candidates = era.characters.filter((c) => matches(search, c.name, c.nickname));

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PageHeader
        icon={Link2}
        title="Mạng Lưới Quan Hệ"
        subtitle={center ? `${edges.length} quan hệ của ${center.name}` : `${total} quan hệ được ghi nhận · chọn một nhân vật để xem`}
      >
        {center && (
          <div className="flex rounded-lg border p-0.5" role="radiogroup" aria-label="Chế độ xem">
            <Button size="sm" variant={mode === "list" ? "secondary" : "ghost"} onClick={() => setMode("list")} role="radio" aria-checked={mode === "list"}>
              <List /> Danh sách
            </Button>
            <Button size="sm" variant={mode === "graph" ? "secondary" : "ghost"} onClick={() => setMode("graph")} role="radio" aria-checked={mode === "graph"}>
              <Network /> Sơ đồ
            </Button>
          </div>
        )}
      </PageHeader>

      <SearchBox
        value={search}
        onChange={(v) => {
          setSearch(v);
          if (center) setCharId("");
        }}
        placeholder="Tìm tên nhân vật…"
        className="flex-none"
      />

      {!center ? (
        candidates.length === 0 ? (
          <EmptyState>Không tìm thấy nhân vật.</EmptyState>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCharId(c.id);
                  setSearch("");
                }}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-bold text-primary">{c.name.charAt(0)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{validRels(c).length} quan hệ đã ghi</span>
                </span>
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{center.name.charAt(0)}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{center.name}</p>
              <p className="text-xs text-muted-foreground">
                {center.cultivation || "Chưa rõ tu vi"} · {edges.length} quan hệ
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => nav.characterById(center.id)}>
              <UserRound /> Hồ sơ
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCharId("")}>
              Chọn người khác
            </Button>
          </div>

          {edges.length === 0 ? (
            <EmptyState>{center.name} chưa có quan hệ nào. Thêm trong hồ sơ nhân vật.</EmptyState>
          ) : mode === "graph" ? (
            <RelationGraph center={center} edges={edges} onSelect={setCharId} />
          ) : (
            <div className="grid gap-3">
              {RELATION_CATALOG.map((g) => {
                const inGroup = edges.filter((e) => e.rel.group === g.key);
                if (inGroup.length === 0) return null;
                return (
                  <section key={g.key} className={cn("rounded-xl border", g.tone)}>
                    <h2 className="px-4 py-2 text-sm font-bold">
                      {g.emoji} {g.label} · {inGroup.length} người
                    </h2>
                    <ul className="grid gap-px border-t border-current/10 bg-background/70 text-foreground">
                      {inGroup.map(({ rel, target }) => (
                        <li key={rel.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                          <span className={cn("size-2 rounded-full", STATUS_META[target.status].dot)} title={STATUS_META[target.status].label} />
                          <button type="button" onClick={() => setCharId(target.id)} className="font-semibold hover:text-primary hover:underline">
                            {target.name}
                          </button>
                          <span className="text-sm text-muted-foreground">{rel.type}</span>
                          {target.cultivation && <span className="text-xs text-muted-foreground">⚡ {target.cultivation}</span>}
                          <Button variant="ghost" size="xs" className="ml-auto" onClick={() => nav.characterById(target.id)}>
                            Hồ sơ
                          </Button>
                          {rel.description && <p className="w-full pl-5 text-xs text-muted-foreground">💬 {rel.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
