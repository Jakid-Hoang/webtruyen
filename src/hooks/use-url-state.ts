"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * A string value stored in the URL query (e.g. ?q=, ?open=, ?tab=).
 * Makes view state deep-linkable and survives reloads.
 */
export function useUrlState(name: string, fallback = ""): [string, (next: string) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const value = params.get(name) ?? fallback;

  const setValue = useCallback(
    (next: string) => {
      const sp = new URLSearchParams(window.location.search);
      if (next && next !== fallback) sp.set(name, next);
      else sp.delete(name);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [name, fallback, pathname, router],
  );

  return [value, setValue];
}

/** Build a link to a view with query params. */
export function viewHref(view: string, params: Record<string, string | undefined> = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `/${view}?${qs}` : `/${view}`;
}
