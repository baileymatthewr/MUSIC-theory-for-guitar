"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Page settings kept in the address (?key=C&scale=major6…), so they can be bookmarked and carry
 * between the Barry Harris pages. `valid` rejects values that came in from a bad link.
 */
export function useUrlState<T extends Record<string, string>>(
  defaults: T,
  valid: (k: keyof T, v: string) => boolean,
): [T, (k: keyof T, v: string) => void] {
  const searchParams = useSearchParams();
  const loaded = useRef(false);
  const [state, setState] = useState<T>(defaults);

  useEffect(() => {
    const next = { ...defaults };
    for (const k of Object.keys(defaults) as (keyof T)[]) {
      const v = searchParams.get(String(k));
      if (v !== null && valid(k, v)) (next as Record<keyof T, string>)[k] = v;
    }
    loaded.current = true;
    setState(next);
    // Read the address once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    // Keep any other parameters already in the address; only write ours.
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(state)) p.set(k, v);
    window.history.replaceState(null, "", `?${p.toString()}`);
  }, [state]);

  return [state, (k, v) => setState((s) => ({ ...s, [k]: v }))];
}
