"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const PAGES = [
  { href: "/barry-harris", label: "The scale" },
  { href: "/barry-harris/scale-grips", label: "Scale grips" },
  { href: "/barry-harris/inverted-grips", label: "Inverted grips" },
];

/** Sub-menu for the Barry Harris pages; carries the chosen key and scale across. */
export default function BarryNav() {
  const path = usePathname();
  const params = useSearchParams();
  const carry = new URLSearchParams();
  for (const k of ["key", "scale"]) {
    const v = params.get(k);
    if (v) carry.set(k, v);
  }
  const q = carry.toString() ? `?${carry.toString()}` : "";
  return (
    <nav className="tabs bh-tabs" aria-label="Barry Harris pages">
      {PAGES.map((p, i) => (
        <Link key={p.href} href={`${p.href}${q}`} className={path === p.href ? "active" : ""} aria-current={path === p.href ? "page" : undefined}>
          <span className="bh-step">{i + 1}</span> {p.label}
        </Link>
      ))}
    </nav>
  );
}
