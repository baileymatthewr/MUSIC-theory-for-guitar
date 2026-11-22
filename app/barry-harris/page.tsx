import type { Metadata } from "next";
import { Suspense } from "react";
import ScaleView from "@/components/barry/ScaleView";

export const metadata: Metadata = {
  title: "Barry Harris Diminished",
  description: "Barry Harris's sixth- and seventh-diminished scales on the staff and across the guitar neck.",
};

export default function BarryHarrisPage() {
  return (
    <>
      <section className="bh-intro">
        <p>
          Barry Harris (1929–2021) was a Detroit-born bebop pianist who spent decades teaching the harmony of
          bebop in workshops around the world. One of his central ideas is that a key&rsquo;s harmony comes from just
          two chords: a <strong>home chord</strong> (a major 6th, minor 6th, dominant 7th or 7♭5) and the{" "}
          <strong>diminished 7th chord</strong> built on the scale&rsquo;s 2nd degree.
        </p>
        <p>
          Put their eight notes in order and you get his <em>sixth-diminished</em> scale. In C that is C D E F G A♭
          A B: C6 (C E G A) with D°7 (D F A♭ B) slotted between its notes. Start with the scale itself below, then
          harmonise it in <strong>Scale grips</strong> and spread it out in <strong>Inverted grips</strong>.
        </p>
      </section>
      <Suspense>
        <ScaleView />
      </Suspense>
    </>
  );
}
