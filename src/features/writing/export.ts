"use client";

import { storyToHtml, storyToMarkdown, storyToText } from "@/lib/writing/convert";
import { getOrderedChapters, type Story } from "@/lib/writing/db";
import { storyToDocx } from "@/lib/writing/docx";

export type ExportFormat = "docx" | "md" | "txt" | "html";

export const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "docx", label: "Word (.docx)" },
  { value: "md", label: "Markdown (.md)" },
  { value: "txt", label: "Văn bản (.txt)" },
  { value: "html", label: "HTML (.html)" },
];

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "").trim() || "truyen";

export async function exportStory(story: Story, format: ExportFormat) {
  const chapters = await getOrderedChapters(story.id);
  const name = safeName(story.title);
  switch (format) {
    case "docx":
      return download(await storyToDocx(story.title, chapters), `${name}.docx`);
    case "md":
      return download(new Blob([storyToMarkdown(chapters)], { type: "text/markdown;charset=utf-8" }), `${name}.md`);
    case "txt":
      return download(new Blob([storyToText(chapters)], { type: "text/plain;charset=utf-8" }), `${name}.txt`);
    case "html":
      return download(new Blob([storyToHtml(story.title, chapters)], { type: "text/html;charset=utf-8" }), `${name}.html`);
  }
}
