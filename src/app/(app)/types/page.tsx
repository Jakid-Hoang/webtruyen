import type { Metadata } from "next";
import { TypesPage } from "@/features/codex/types-page";

export const metadata: Metadata = { title: "Loại mục tự tạo · Codex" };

export default function Page() {
  return <TypesPage />;
}
