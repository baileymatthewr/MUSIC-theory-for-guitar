import type { Metadata } from "next";
import { Suspense } from "react";
import InvertedExplorer from "@/components/barry/InvertedExplorer";

export const metadata: Metadata = {
  title: "Inverted grips · Barry Harris Diminished",
  description: "Contrary motion through Barry Harris's diminished scales: the top note climbs while the bass falls.",
};

export default function InvertedGripsPage() {
  return (
    <>
      <section className="bh-intro">
        <p>
          Here the scale moves in <strong>contrary motion</strong>. Start from the home chord in close position, then
          move the top note up and the bass down, one scale note at a time. Because the scale alternates home and
          diminished notes, every step lands on the other chord, and each grip is wider than the last.
        </p>
      </section>
      <Suspense>
        <InvertedExplorer />
      </Suspense>
    </>
  );
}
