import type { AnyExtension } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";

/*
 * The document schema shared by the editor and by HTML import/export, so both
 * sides agree on which nodes/marks exist. Anything else in imported HTML
 * (scripts, styles, unknown tags) is dropped by the schema itself.
 */

/**
 * Mention lưu id dạng "loạiMục:idMục" (vd "char:ab12cd"), dùng được cho mọi
 * loại mục trong TYPES và loại tự tạo.
 */
export function parseMentionId(id: string | null | undefined): { kind: string; id: string } | null {
  const m = /^([A-Za-z0-9_-]+):(.+)$/.exec(id ?? "");
  return m ? { kind: m[1], id: m[2] } : null;
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
