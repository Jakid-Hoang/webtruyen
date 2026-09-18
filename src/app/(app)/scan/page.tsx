import type { Metadata } from "next";
import { ScanPage } from "@/features/codex/scan-page";

export const metadata: Metadata = { title: "Dò tên lạ · Codex" };

export default function Page() {
  return <ScanPage />;
}
