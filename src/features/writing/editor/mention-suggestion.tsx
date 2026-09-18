"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { cn } from "@/lib/utils";
import { fold } from "@/lib/text";
import type { WikiEntry } from "./wiki-entries";

interface ListHandle {
  onKeyDown: (p: SuggestionKeyDownProps) => boolean;
}

const MentionList = forwardRef<ListHandle, SuggestionProps<WikiEntry>>(function MentionList({ items, command }, ref) {
  const [index, setIndex] = useState(0);
  // Keep the highlighted row valid when the list shrinks.
  const [lastItems, setLastItems] = useState(items);
  if (lastItems !== items) {
    setLastItems(items);
    setIndex(0);
  }
  const pick = (i: number) => {
    const it = items[i];
    if (it) command({ id: `${it.kind}:${it.id}`, label: it.name } as unknown as WikiEntry);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + items.length) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        pick(index);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="w-72 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg" role="listbox">
      {items.length === 0 ? (
        <p className="px-2 py-1.5 text-xs text-muted-foreground">Không có mục nào trong wiki khớp.</p>
      ) : (
        items.map((it, i) => (
          <button
            key={`${it.kind}:${it.id}:${it.name}`}
            type="button"
            role="option"
            aria-selected={i === index}
            onMouseEnter={() => setIndex(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(i);
            }}
            className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm", i === index && "bg-muted")}
          >
            <span>{it.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{it.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {it.typeLabel}
                {it.sub ? ` · ${it.sub}` : ""}
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  );
});

/** Suggestion config for "@" mentions; entries come from the editor's wikiHighlight storage. */
export function mentionSuggestion(): Omit<SuggestionOptions<WikiEntry>, "editor"> {
  return {
    char: "@",
    allowSpaces: true,
    items: ({ query, editor }) => {
      const q = fold(query);
      return editor.storage.wikiHighlight.entries
        .filter((e) => fold(e.name).includes(q))
        .sort((a, b) => Number(!fold(a.name).startsWith(q)) - Number(!fold(b.name).startsWith(q)))
        .slice(0, 8);
    },
    render: () => {
      let renderer: ReactRenderer<ListHandle, SuggestionProps<WikiEntry>> | null = null;
      let host: HTMLDivElement | null = null;

      const place = (props: SuggestionProps<WikiEntry>) => {
        const rect = props.clientRect?.();
        if (!rect || !host) return;
        const below = rect.bottom + 6;
        const fitsBelow = below + 320 < window.innerHeight;
        host.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;
        host.style.top = fitsBelow ? `${below}px` : "";
        host.style.bottom = fitsBelow ? "" : `${window.innerHeight - rect.top + 6}px`;
      };

      return {
        onStart: (props) => {
          renderer = new ReactRenderer(MentionList, { props, editor: props.editor });
          host = document.createElement("div");
          host.style.position = "fixed";
          host.style.zIndex = "60";
          host.appendChild(renderer.element);
          document.body.appendChild(host);
          place(props);
        },
        onUpdate: (props) => {
          renderer?.updateProps(props);
          place(props);
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            host?.remove();
            return true;
          }
          return renderer?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          host?.remove();
          renderer?.destroy();
          host = null;
          renderer = null;
        },
      };
    },
  };
}
