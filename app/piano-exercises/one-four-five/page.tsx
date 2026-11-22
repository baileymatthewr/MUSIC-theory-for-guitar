import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import OneFourFive from "@/components/piano/OneFourFive";

export const metadata: Metadata = {
  title: "I – IV – V on strings 4-3-2 · Piano Exercises for Guitar",
  description: "I, IV and V as tight triads on the D, G and B strings, moving as little as possible.",
};

export default function OneFourFivePage() {
  return (
    <>
      <p className="pe-back">
        <Link href="/piano-exercises">← All exercises</Link>
      </p>
      <section className="bh-intro">
        <h2 className="pe-title">I – IV – V on strings 4-3-2</h2>
        <p>
          I, IV and V are the three major chords of a key (in C: C, F and G), behind countless songs. Instead of
          the open-position &ldquo;cowboy&rdquo; shapes, play each one as a three-note triad on the D, G and B strings,
          and pick the shape of the next chord that is <strong>closest to your hand</strong>. From I to IV one note
          stays put and the other two move up a fret or two. IV to V shares no notes, so all three move, but only a
          little.
        </p>
        <p>
          Each row starts from a different shape of the I chord (root position, 1st inversion, 2nd inversion), so
          together they cover the neck. Between the grips you can see how far each string moves. Click a grip to
          open it in the Chord Box Maker.
        </p>
      </section>
      <Suspense>
        <OneFourFive />
      </Suspense>
    </>
  );
}
