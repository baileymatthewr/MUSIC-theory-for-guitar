import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Piano Exercises for Guitar",
  description: "Keyboard voice-leading exercises adapted for the guitar.",
};

const EXERCISES = [
  {
    href: "/piano-exercises/one-four-five",
    title: "I – IV – V on strings 4-3-2",
    text: "Play the three main chords of a key as tight triads on the D, G and B strings, keeping the common note and moving the others by a half or whole step, the way a pianist does.",
  },
];

export default function PianoExercisesPage() {
  return (
    <>
      <section className="bh-intro">
        <p>
          Pianists learn chords as <strong>voice leading</strong>: when the harmony changes, any note the two chords
          share stays where it is and the rest move to the nearest note of the next chord. Guitarists often learn
          chords as separate shapes instead, like the open &ldquo;cowboy&rdquo; chords, which jump around the neck.
          These exercises take keyboard habits and put them on the fretboard, using small grips that move as little as
          possible.
        </p>
      </section>
      <section className="modules" aria-label="Exercises">
        {EXERCISES.map((e) => (
          <Link key={e.href} href={e.href} className="module-card">
            <h2>{e.title}</h2>
            <p>{e.text}</p>
            <span className="module-go">Open →</span>
          </Link>
        ))}
      </section>
    </>
  );
}
