import type { Metadata } from "next";
import { StatsPage } from "@/features/codex/stats-page";

export const metadata: Metadata = { title: "Thống kê · Codex" };

export default function Page() {
  return <StatsPage />;
}
