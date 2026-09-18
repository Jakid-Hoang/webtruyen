import type { AnyExtension } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";

/*
 * The document schema shared by the editor and by HTML import/export, so both
 * sides agree on which nodes/marks exist. Anything else in imported HTML
 * (scripts, styles, unknown tags) is dropped by the schema itself.
 */

/** Wiki entity kinds that can be @mentioned. Stored in the mention id as "kind:id". */
export const MENTION_KINDS = {
  c: { label: "Nhân vật", icon: "👤", view: "characters" },
  f: { label: "Thế lực", icon: "🛡️", view: "factions" },
  l: { label: "Vùng đất", icon: "🗺️", view: "world" },
  a: { label: "Công pháp", icon: "📘", view: "arts" },
  t: { label: "Pháp bảo", icon: "⚔️", view: "treasures" },
  s: { label: "Thần thông", icon: "⚡", view: "skills" },
  r: { label: "Chủng tộc", icon: "🧬", view: "races" },
} as const;
export type MentionKind = keyof typeof MENTION_KINDS;

export function parseMentionId(id: string | null | undefined): { kind: MentionKind; id: string } | null {
  const m = /^([a-z]):(.+)$/.exec(id ?? "");
  return m && m[1] in MENTION_KINDS ? { kind: m[1] as MentionKind, id: m[2] } : null;
}

export const WikiMention = Mention.extend({ name: "mention" }).configure({
  HTMLAttributes: { class: "mention" },
  renderText: ({ node }) => String(node.attrs.label ?? ""),
  renderHTML: ({ node, options }) => [
    "span",
    { ...options.HTMLAttributes, "data-type": "mention", "data-id": node.attrs.id, "data-label": node.attrs.label },
    String(node.attrs.label ?? ""),
  ],
});

export const StoryStarterKit = StarterKit.configure({
  heading: { levels: [1, 2, 3] },
  code: false,
  codeBlock: false,
  link: { openOnClick: false, autolink: true },
});

/** Extensions needed to parse/serialize story HTML (no UI-only plugins). */
export const schemaExtensions: AnyExtension[] = [StoryStarterKit, WikiMention];
