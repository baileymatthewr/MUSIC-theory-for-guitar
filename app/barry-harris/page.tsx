import type { Metadata } from "next";
import { Suspense } from "react";
import DiminishedExplorer from "@/components/barry/DiminishedExplorer";

export const metadata: Metadata = {
  title: "Barry Harris Diminished",
  description: "Barry Harris's sixth- and seventh-diminished scales harmonised as guitar grips in any key.",
};

export default function BarryHarrisPage() {
  return (
    <main className="page">
      <header className="masthead">
        <h1>
          Barry Harris <span>Diminished</span>
        </h1>
      </header>

      <section className="bh-intro">
        <p>
          Barry Harris (1929–2021) was a Detroit-born bebop pianist who spent decades teaching the harmony of
          bebop in workshops around the world. One of his central ideas is that a key&rsquo;s harmony comes from just
          two chords: a <strong>home chord</strong> (a major 6th, minor 6th, dominant 7th or 7♭5) and the{" "}
          <strong>diminished 7th chord</strong> built on the scale&rsquo;s 2nd degree.
        </p>
        <p>
          Put their eight notes in order and you get his <em>sixth-diminished</em> scale. In C that is C D E F G A♭
          A B: C6 (C E G A) with D°7 (D F A♭ B) slotted between its notes. Stack every other note to harmonise the scale
          and the two chords alternate through all their inversions: C6, D°7, C6/E, F°7, C6/G, A♭°7, C6/A, B°7. The
          diminished chord is the moving part. Lower any one of its notes a half step and you get one of four dominant
          7th chords; raise any one and you get one of four minor 6th chords.
        </p>
        <p>
          Pick a key and a string set below to see every grip of the scale up the neck. Home-chord grips are dark and
          diminished grips are orange. Click any grip to see it with its notation and its diminished family.
        </p>
      </section>

      <Suspense>
        <DiminishedExplorer />
      </Suspense>

      <p className="home-sources">
        Further reading:{" "}
        <a href="https://en.wikipedia.org/wiki/Bebop_scale" target="_blank" rel="noreferrer">
          Wikipedia: Bebop scale
        </a>
        {" · "}
        <a href="https://jazzworkshops.com/evolutionary-voicings-part-1/" target="_blank" rel="noreferrer">
          Howard Rees: Evolutionary Voicings
        </a>
        {" · "}
        <a
          href="https://www.jazz-guitar-licks.com/blog/lessons/major-sixth-diminished-jazz-guitar-lesson-around-the-barry-harris-concept.html"
          target="_blank"
          rel="noreferrer"
        >
          Major sixth diminished scale for guitar
        </a>
        {" · "}
        <a href="https://en.wikipedia.org/wiki/Barry_Harris" target="_blank" rel="noreferrer">
          Barry Harris
        </a>
      </p>
    </main>
  );
}
