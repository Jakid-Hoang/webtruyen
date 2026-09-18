import type { Metadata } from "next";
import { Suspense } from "react";
import { ReadPage } from "@/features/codex/read-page";

export const metadata: Metadata = { title: "Đọc & kiểm tra · Codex" };

export default function Page() {
  return (
    <Suspense>
      <ReadPage />
    </Suspense>
  );
}
