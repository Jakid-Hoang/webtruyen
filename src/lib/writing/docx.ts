import type { JSONContent } from "@tiptap/core";
import type { ChapterLike } from "./convert";

/** Build a .docx: each chapter is a Heading 1 starting on a new page. Loaded lazily (large lib). */
export async function storyToDocx(title: string, chapters: ChapterLike[]): Promise<Blob> {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

  const runs = (nodes: JSONContent[] = []) =>
    nodes.map((n) => {
      if (n.type === "hardBreak") return new TextRun({ text: "", break: 1 });
      const marks = new Set(n.marks?.map((m) => m.type));
      return new TextRun({
        text: n.type === "mention" ? String(n.attrs?.label ?? "") : (n.text ?? ""),
        bold: marks.has("bold"),
        italics: marks.has("italic"),
        underline: marks.has("underline") ? {} : undefined,
        strike: marks.has("strike"),
      });
    });

  const blocks = (doc: JSONContent) => {
    const out: InstanceType<typeof Paragraph>[] = [];
    const walk = (n: JSONContent, opts: { quote?: boolean; bullet?: string } = {}) => {
      switch (n.type) {
        case "heading":
          // Chapter body headings are demoted one level so H1 stays a chapter boundary.
          out.push(new Paragraph({ heading: HEADINGS[Math.min(2, n.attrs?.level ?? 2)], children: runs(n.content) }));
          break;
        case "paragraph":
          out.push(
            new Paragraph({
              children: [...(opts.bullet ? [new TextRun(opts.bullet)] : []), ...runs(n.content)],
              indent: opts.quote || opts.bullet ? { left: 720 } : undefined,
            }),
          );
          break;
        case "horizontalRule":
          out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("* * *")] }));
          break;
        case "blockquote":
          n.content?.forEach((c) => walk(c, { quote: true }));
          break;
        case "bulletList":
        case "orderedList":
          n.content?.forEach((li, i) => li.content?.forEach((c) => walk(c, { bullet: n.type === "orderedList" ? `${i + 1}. ` : "• " })));
          break;
        default:
          n.content?.forEach((c) => walk(c, opts));
      }
    };
    walk(doc);
    return out;
  };

  const doc = new Document({
    title,
    sections: [
      {
        children: chapters.flatMap((c, i) => [
          new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: i > 0, children: [new TextRun(c.title)] }),
          ...blocks(c.content),
        ]),
      },
    ],
  });
  return Packer.toBlob(doc);
}

/** .docx → HTML (headings, emphasis, lists preserved). */
export async function docxToHtml(file: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer: file });
  return result.value;
}
