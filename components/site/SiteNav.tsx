"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/chord-box", label: "Chord Box Maker" },
  { href: "/barry-harris", label: "Barry Harris Diminished" },
  { href: "/piano-exercises", label: "Piano for Guitar" },
  { href: "/about", label: "About" },
];

export default function SiteNav() {
  const path = usePathname();
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand">
          Fretboard <span>Tools</span>
        </Link>
        <nav aria-label="Site">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
