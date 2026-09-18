import { redirect } from "next/navigation";

/** Đường cũ /library (thư viện skill) — giữ lại cho liên kết đã có. */
export default async function Page(props: PageProps<"/library">) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await props.searchParams)) if (typeof v === "string") sp.set(k, v);
  const qs = sp.toString();
  redirect(qs ? `/library/skill?${qs}` : "/library/skill");
}
