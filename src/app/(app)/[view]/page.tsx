import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ViewRenderer } from "@/features/view-renderer";
import { VIEWS, getView, isViewKey } from "@/lib/nav";

export const dynamicParams = false;

export function generateStaticParams() {
  return VIEWS.map((v) => ({ view: v.key }));
}

export async function generateMetadata(props: PageProps<"/[view]">): Promise<Metadata> {
  const { view } = await props.params;
  return { title: isViewKey(view) ? `${getView(view).label} · Character Wiki` : "Character Wiki" };
}

export default async function ViewPage(props: PageProps<"/[view]">) {
  const { view } = await props.params;
  if (!isViewKey(view)) notFound();
  return (
    <Suspense>
      <ViewRenderer view={view} />
    </Suspense>
  );
}
