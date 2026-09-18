import { generateHTML, generateJSON, type JSONContent } from "@tiptap/core";
import { countWords } from "./db";
import { schemaExtensions } from "./schema";

/* ───────────── JSON helpers ───────────── */

export function docToText(doc: JSONContent): string {
  const out: string[] = [];
  const walk = (n: JSONContent) => {
    if (n.type === "text") out.push(n.text ?? "");
    else if (n.type === "mention") out.push(String(n.attrs?.label ?? ""));
    else if (n.type === "hardBreak") out.push("\n");
    n.content?.forEach(walk);
    if (n.type && ["paragraph", "heading", "listItem", "blockquote", "horizontalRule"].includes(n.type)) out.push("\n");
  };
  walk(doc);
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export const docWordCount = (doc: JSONContent) => countWords(docToText(doc));

/** Chapter bodies must not contain H1: H1 marks chapter boundaries in exports. */
function demoteH1(doc: JSONContent): JSONContent {
  const map = (n: JSONContent): JSONContent => ({
    ...n,
    attrs: n.type === "heading" && n.attrs?.level === 1 ? { ...n.attrs, level: 2 } : n.attrs,
    content: n.content?.map(map),
  });
  return map(doc);
}

export function htmlToDoc(html: string): JSONContent {
  return generateJSON(html, schemaExtensions);
}

export function docToHtml(doc: JSONContent): string {
  return generateHTML(doc, schemaExtensions);
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

export interface ChapterLike {
  title: string;
  content: JSONContent;
}

/** One HTML document for the whole story: each chapter is an H1 followed by its body. */
export function storyToHtml(title: string, chapters: ChapterLike[]): string {
  const body = chapters.map((c) => `<h1>${escapeHtml(c.title)}</h1>\n${docToHtml(demoteH1(c.content))}`).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body>${body}</body></html>`;
}

/* ───────────── Google Docs HTML cleanup ───────────── */

/**
 * Google's HTML export encodes bold/italic/underline as CSS classes on spans
 * and wraps links in google.com/url redirects. Rewrite into semantic tags.
 */
export function normalizeGoogleHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const styles = new Map<string, { b: boolean; i: boolean; u: boolean }>();
  for (const style of doc.querySelectorAll("style")) {
    for (const m of style.textContent?.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g) ?? []) {
      const css = m[2].replace(/\s+/g, "");
      styles.set(m[1], {
        b: /font-weight:(700|800|900|bold)/.test(css),
        i: /font-style:italic/.test(css),
        u: /text-decoration:underline/.test(css),
      });
    }
  }
  doc.querySelectorAll("style, script, meta, title, link").forEach((el) => el.remove());

  for (const span of [...doc.querySelectorAll("span[class]")]) {
    const flags = { b: false, i: false, u: false };
    for (const cls of span.classList) {
      const s = styles.get(cls);
      if (s) {
        flags.b ||= s.b;
        flags.i ||= s.i;
        flags.u ||= s.u;
      }
    }
    let node: Node = doc.createDocumentFragment();
    node.appendChild(doc.createRange().createContextualFragment(span.innerHTML));
    for (const [on, tag] of [
      [flags.u, "u"],
      [flags.i, "em"],
      [flags.b, "strong"],
    ] as const) {
      if (!on) continue;
      const wrap = doc.createElement(tag);
      wrap.appendChild(node);
      node = wrap;
    }
    span.replaceWith(node);
  }

  for (const a of doc.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    try {
      const url = new URL(a.href);
      if (url.hostname === "www.google.com" && url.pathname === "/url") a.href = url.searchParams.get("q") ?? a.href;
    } catch {
      /* keep as is */
    }
  }
  // Google's "Title" paragraph style: treat as a top-level heading so it isn't lost.
  doc.querySelectorAll("p.title").forEach((p) => {
    const h = doc.createElement("h1");
    h.innerHTML = p.innerHTML;
    p.replaceWith(h);
  });
  return doc.body.innerHTML;
}

/* ───────────── Chapter splitting ───────────── */

export type SplitMode = "auto" | "h1" | "h2" | "pattern" | "single";

export const SPLIT_MODES: { value: SplitMode; label: string }[] = [
  { value: "auto", label: "Tự động" },
  { value: "h1", label: "Theo Heading 1" },
  { value: "h2", label: "Theo Heading 2" },
  { value: "pattern", label: "Theo dòng “Chương N …”" },
  { value: "single", label: "Cả tài liệu là 1 chương" },
];

const CHAPTER_LINE = /^\s*(chương|chuong|chapter|hồi|quyển|phần)\s+([0-9]+|[ivxlcdm]+|[a-zà-ỹ]+)\b/i;

export interface SplitChapter {
  title: string;
  content: JSONContent;
  wordCount: number;
}

function resolveMode(root: HTMLElement, mode: SplitMode): Exclude<SplitMode, "auto"> {
  if (mode !== "auto") return mode;
  if (root.querySelector(":scope > h1")) return "h1";
  const lines = [...root.children].filter((el) => CHAPTER_LINE.test(el.textContent ?? ""));
  if (lines.length > 0) return "pattern";
  if (root.querySelector(":scope > h2")) return "h2";
  return "single";
}

/** Split HTML into chapters. Content before the first boundary becomes "Mở đầu". */
export function splitHtmlIntoChapters(html: string, mode: SplitMode = "auto", fallbackTitle = "Chương 1"): SplitChapter[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const root = doc.body;
  // Flatten single wrapper divs (mammoth/Google sometimes nest).
  while (root.children.length === 1 && root.firstElementChild?.tagName === "DIV") {
    root.innerHTML = root.firstElementChild.innerHTML;
  }
  const resolved = resolveMode(root, mode);
  const isBoundary = (el: Element) => {
    const text = (el.textContent ?? "").trim();
    if (!text) return false;
    if (resolved === "h1") return el.tagName === "H1";
    if (resolved === "h2") return el.tagName === "H2";
    if (resolved === "pattern") return text.length < 120 && CHAPTER_LINE.test(text);
    return false;
  };

  const groups: { title: string; parts: string[] }[] = [];
  let current: { title: string; parts: string[] } = { title: "", parts: [] };
  for (const el of [...root.children]) {
    if (isBoundary(el)) {
      if (current.title || current.parts.some((p) => p.replace(/<[^>]+>/g, "").trim())) groups.push(current);
      current = { title: (el.textContent ?? "").trim(), parts: [] };
    } else {
      current.parts.push(el.outerHTML);
    }
  }
  if (current.title || current.parts.some((p) => p.replace(/<[^>]+>/g, "").trim())) groups.push(current);
  if (groups.length === 0) groups.push({ title: fallbackTitle, parts: [] });

  return groups.map((g, i) => {
    const content = htmlToDoc(g.parts.join("") || "<p></p>");
    return {
      title: g.title || (i === 0 && groups.length > 1 ? "Mở đầu" : fallbackTitle),
      content,
      wordCount: docWordCount(content),
    };
  });
}

/* ───────────── Plain text & Markdown ───────────── */

export function textToHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}|\n/)
    .map((line) => line.trim())
    .map((line) => (line === "***" || line === "* * *" ? "<hr>" : `<p>${escapeHtml(line)}</p>`))
    .join("");
}

function mdInline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** Minimal Markdown → HTML (headings, emphasis, lists, quotes, rules). */
export function markdownToHtml(md: string): string {
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of md.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    let m: RegExpExecArray | null;
    if (!line.trim()) {
      closeList();
      continue;
    }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
      closeList();
      out.push(`<h${m[1].length}>${mdInline(m[2])}</h${m[1].length}>`);
    } else if (/^(\*\s*\*\s*\*|-{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      out.push("<hr>");
    } else if ((m = /^\s*[-*+]\s+(.*)$/.exec(line))) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li><p>${mdInline(m[1])}</p></li>`);
    } else if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li><p>${mdInline(m[1])}</p></li>`);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      closeList();
      out.push(`<blockquote><p>${mdInline(m[1])}</p></blockquote>`);
    } else {
      closeList();
      out.push(`<p>${mdInline(line)}</p>`);
    }
  }
  closeList();
  return out.join("");
}

function inlineToMd(nodes: JSONContent[] = []): string {
  return nodes
    .map((n) => {
      if (n.type === "hardBreak") return "  \n";
      if (n.type === "mention") return String(n.attrs?.label ?? "");
      let t = n.text ?? "";
      const marks = new Set(n.marks?.map((m) => m.type));
      if (marks.has("bold")) t = `**${t}**`;
      if (marks.has("italic")) t = `*${t}*`;
      const link = n.marks?.find((m) => m.type === "link");
      if (link) t = `[${t}](${link.attrs?.href})`;
      return t;
    })
    .join("");
}

export function docToMarkdown(doc: JSONContent): string {
  const blocks: string[] = [];
  const walk = (n: JSONContent, prefix = "") => {
    switch (n.type) {
      case "heading":
        blocks.push(`${"#".repeat(Math.max(2, n.attrs?.level ?? 2))} ${inlineToMd(n.content)}`);
        break;
      case "paragraph":
        blocks.push(prefix + inlineToMd(n.content));
        break;
      case "horizontalRule":
        blocks.push("* * *");
        break;
      case "blockquote":
        n.content?.forEach((c) => walk(c, "> "));
        break;
      case "bulletList":
      case "orderedList":
        n.content?.forEach((li, i) =>
          li.content?.forEach((c) => walk(c, n.type === "orderedList" ? `${i + 1}. ` : "- ")),
        );
        break;
      default:
        n.content?.forEach((c) => walk(c, prefix));
    }
  };
  walk(doc);
  return blocks.join("\n\n");
}

/* Story title is left out of MD/TXT so re-importing yields exactly the chapters. */

export function storyToMarkdown(chapters: ChapterLike[]): string {
  return chapters.map((c) => `# ${c.title}\n\n${docToMarkdown(c.content)}`).join("\n\n");
}

export function storyToText(chapters: ChapterLike[]): string {
  return chapters.map((c) => `${c.title}\n\n${docToText(c.content)}`).join("\n\n\n");
}
