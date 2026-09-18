import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { WikiEntry } from "./wiki-entries";

export const wikiHighlightKey = new PluginKey<DecorationSet>("wikiHighlight");

export interface WikiHighlightStorage {
  /** All wiki entries; also read by the "@" mention suggestion. */
  entries: WikiEntry[];
  byName: Map<string, WikiEntry>;
  regex: RegExp | null;
}
type Storage = WikiHighlightStorage;

declare module "@tiptap/core" {
  interface Storage {
    wikiHighlight: WikiHighlightStorage;
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function build(doc: PMNode, storage: Storage): DecorationSet {
  const { regex, byName } = storage;
  if (!regex) return DecorationSet.empty;
  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    regex.lastIndex = 0;
    for (const m of node.text.matchAll(regex)) {
      const entry = byName.get(m[0]);
      if (!entry) continue;
      decos.push(
        Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
          class: `wiki-name wiki-${entry.kind}`,
          "data-wiki": `${entry.kind}:${entry.id}`,
          title: `${entry.typeLabel}: ${entry.canonical}${entry.name !== entry.canonical ? ` (gọi là “${entry.name}”)` : ""} — Ctrl+Click để mở`,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decos);
}

/** Underlines every known wiki name in the text (case-sensitive, whole words). */
export const WikiHighlight = Extension.create<Record<string, never>, Storage>({
  name: "wikiHighlight",

  addStorage() {
    return { entries: [], byName: new Map(), regex: null };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin<DecorationSet>({
        key: wikiHighlightKey,
        state: {
          init: (_, state) => build(state.doc, storage),
          apply: (tr, old) => (tr.docChanged || tr.getMeta(wikiHighlightKey) ? build(tr.doc, storage) : old.map(tr.mapping, tr.doc)),
        },
        props: {
          decorations: (state) => wikiHighlightKey.getState(state),
        },
      }),
    ];
  },
});

/** Replace the set of highlighted names (longest names win on overlap). */
export function setWikiNames(storage: Storage, entries: WikiEntry[]) {
  storage.entries = entries;
  storage.byName = new Map(entries.map((e) => [e.name, e]));
  const names = [...storage.byName.keys()].sort((a, b) => b.length - a.length);
  storage.regex = names.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${names.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "gu") : null;
}
