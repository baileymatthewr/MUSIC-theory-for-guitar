import type { Metadata } from "next";
import { Suspense } from "react";
import DiminishedExplorer from "@/components/barry/DiminishedExplorer";

export const metadata: Metadata = {
  title: "Scale grips · Barry Harris Diminished",
  description: "Barry Harris's diminished scales harmonised as drop-2 and drop-3 guitar grips in any key.",
};

export default function ScaleGripsPage() {
  return (
    <>
      <section className="bh-intro">
        <p>
          Stack every other note of the scale to harmonise it, and the two chords alternate through all their
          inversions: in C, C6, D°7, C6/E, F°7, C6/G, A♭°7, C6/A, B°7. The diminished chord is the moving part: lower
          any one of its notes a half step and you get one of four dominant 7th chords; raise any one and you get one of
          four minor 6th chords.
        </p>
        <p>
          Pick a key and a string set to see every grip of the scale up the neck. Home-chord grips are dark and
          diminished grips are orange. Click any grip to see it with its notation and its diminished family.
        </p>
      </section>
      <Suspense>
        <DiminishedExplorer />
      </Suspense>
    </>
  );
}
