import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Why this site uses standard sheet music instead of tablature.",
};

export default function AboutPage() {
  return (
    <main className="page">
      <article className="about">
        <header className="masthead">
          <h1>
            Why <span>sheet music</span>
          </h1>
        </header>

        <p className="about-lead">
          I value playing music with other people. Nearly every other instrument in an ensemble reads standard sheet
          music, and that notation already describes the music clearly. So it has always seemed frivolous to me for
          guitarists to lean on tablature, or to read only the treble clef.
        </p>

        <h2>Like learning to read English</h2>
        <p>
          Learning to read music is a lot like learning to read English. Many words you simply memorize, because there
          isn&rsquo;t a good rule to explain why they are spelled the way they are. Sheet music has some of that too.
          Not everything about it can be reasoned out ahead of time, but once you know it, you can read it.
        </p>

        <h2>No translation step</h2>
        <p>
          Reading sheet music means anyone can play the same piece straight from the page, without first going through
          a &ldquo;translation&rdquo; into some other format. That translation isn&rsquo;t always even feasible. When
          everyone reads the same notation, the music is shared as written.
        </p>

        <h2>SATB on guitar</h2>
        <p>
          During the pandemic I made myself learn to play SATB choral music on guitar: soprano, alto, tenor and bass,
          read from the score. I found it very satisfying and gratifying. That is also why the tools on this site write
          notes on the full grand staff, treble and bass clef together, at the pitch the guitar really sounds.
        </p>

        <h2>Follow along</h2>
        <p>
          I invite anyone who would like to follow in my footsteps, and my thought process, to come along. The tools here
          are where I&rsquo;d start:
        </p>
        <ul className="about-links">
          <li>
            <Link href="/chord-box">Chord Box Maker</Link>: build a grip and see it on the grand staff, or write notes on
            the staff and find the grips that play them.
          </li>
          <li>
            <Link href="/barry-harris">Barry Harris Diminished</Link>: one scale, its grips and their notation across the
            neck.
          </li>
          <li>
            <Link href="/piano-exercises">Piano Exercises for Guitar</Link>: keyboard voice leading on the fretboard.
          </li>
        </ul>
      </article>
    </main>
  );
}
