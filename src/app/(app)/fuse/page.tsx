import type { Metadata } from "next";
import { FusePage } from "@/features/codex/fuse-page";

export const metadata: Metadata = { title: "Kết hợp skill · Codex" };

export default function Page() {
  return <FusePage />;
}
