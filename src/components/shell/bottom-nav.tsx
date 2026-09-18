"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/nav";

/** Mobile-only horizontal nav pinned to the bottom of the screen. */
export function BottomNav({ activeView }: { activeView: string | null }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
      <ul className="flex gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none]">
        {NAV_LINKS.map(({ key, href, label, icon: Icon }) => (
          <li key={key} className="shrink-0">
            <Link
              href={href}
              aria-current={activeView === key ? "page" : undefined}
              className={cn(
                "flex w-16 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold",
                activeView === key ? "bg-primary/15 text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
