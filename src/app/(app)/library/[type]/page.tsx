import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryPage } from "@/features/codex/library-page";
import { TYPES } from "@/lib/codex/types";

export async function generateMetadata(props: PageProps<"/library/[type]">): Promise<Metadata> {
  const { type } = await props.params;
  const label = TYPES.find((t) => t.k === type)?.l ?? "Thư viện";
  return { title: `Thư viện mẫu · ${label} · Codex` };
}

export default async function Page(props: PageProps<"/library/[type]">) {
  const { type } = await props.params;
  return (
    <Suspense>
      <LibraryPage typeKey={type} />
    </Suspense>
  );
}
