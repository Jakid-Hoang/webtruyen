import type { Metadata } from "next";
import { RecapPage } from "@/features/writing/recap-page";

export const metadata: Metadata = { title: "Tóm tắt cốt truyện · Codex" };

export default function Page() {
  return <RecapPage />;
}
