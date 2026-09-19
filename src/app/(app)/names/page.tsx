import type { Metadata } from "next";
import { NamesPage } from "@/features/codex/names-page";

export const metadata: Metadata = { title: "Máy đặt tên · Codex" };

export default function Page() {
  return <NamesPage />;
}
