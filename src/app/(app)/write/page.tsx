import type { Metadata } from "next";
import { StoriesPage } from "@/features/writing/stories-page";

export const metadata: Metadata = { title: "Viết Truyện · Character Wiki" };

export default function WritePage() {
  return <StoriesPage />;
}
