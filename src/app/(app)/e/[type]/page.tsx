import type { Metadata } from "next";
import { Suspense } from "react";
import { EntityPage } from "@/features/codex/entity-page";
import { TYPES } from "@/lib/codex/types";

export async function generateMetadata(props: PageProps<"/e/[type]">): Promise<Metadata> {
  const { type } = await props.params;
  const label = TYPES.find((t) => t.k === type)?.l ?? "Loại mục";
  return { title: `${label} · Codex` };
}

export default async function TypePage(props: PageProps<"/e/[type]">) {
  const { type } = await props.params;
  return (
    <Suspense>
      <EntityPage typeKey={type} />
    </Suspense>
  );
}
