import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryPage } from "@/features/codex/library-page";

export const metadata: Metadata = { title: "Thư viện skill mẫu · Codex" };

export default function Page() {
  return (
    <Suspense>
      <LibraryPage />
    </Suspense>
  );
}
