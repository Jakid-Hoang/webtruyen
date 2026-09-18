"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mobile: các mục dùng nhiều nhất; phần còn lại nằm trong menu ☰. */
const QUICK = [
  { key: "world", href: "/world", label: "Thế giới", icon: "🜁" },
  { key: "char", href: "/e/char", label: "Nhân vật", icon: "👤" },
  { key: "skill", href: "/e/skill", label: "Skill", icon: "✦" },
  { key: "write", href: "/write", label: "Viết", icon: "✍" },
  { key: "stats", href: "/stats", label: "Thống kê", icon: "📊" },
];

export function BottomNav({ activeView }: { activeView: string | null }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
      <ul className="flex justify-around gap-1 px-2 py-1.5">
        {QUICK.map((it) => (
          <li key={it.key} className="shrink-0">
            <Link
              href={it.href}
              aria-current={activeView === it.key ? "page" : undefined}
              className={cn(
                "flex w-16 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold",
                activeView === it.key ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              <span className="text-lg leading-none" aria-hidden>
                {it.icon}
              </span>
              <span className="truncate">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
