import type { Metadata } from "next";
import { Suspense } from "react";
import { StoryWorkspace } from "@/features/writing/story-workspace";

export const metadata: Metadata = { title: "Viết Truyện · Character Wiki" };

export default async function StoryPage(props: PageProps<"/write/[storyId]">) {
  const { storyId } = await props.params;
  return (
    <Suspense>
      <StoryWorkspace storyId={storyId} />
    </Suspense>
  );
}
