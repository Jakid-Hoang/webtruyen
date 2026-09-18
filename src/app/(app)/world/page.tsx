import type { Metadata } from "next";
import { WorldPage } from "@/features/codex/world-page";

export const metadata: Metadata = { title: "Thế giới & hệ · Codex" };

export default function Page() {
  return <WorldPage />;
}
