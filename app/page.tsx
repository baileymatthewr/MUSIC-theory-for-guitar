import Link from "next/link";
import { redirect } from "next/navigation";

const MODULES = [
  {
    href: "/chord-box",
    title: "Chord Box Maker",
    text: "Build chord diagrams by clicking the neck, typing a shape, writing notes on the grand staff or typing a chord name, then download them as images.",
  },
  {
    href: "/barry-harris",
    title: "Barry Harris Diminished",
    text: "Pick a key and see Barry Harris's sixth- and seventh-diminished scales harmonised as playable grips across the whole neck.",
  },
  {
    href: "/piano-exercises",
    title: "Piano Exercises for Guitar",
    text: "Keyboard voice-leading exercises on the fretboard, starting with I–IV–V as tight triads that barely move.",
  },
];

// Before the site had pages, the Chord Box Maker lived at "/". Send old links there.
const CHORD_BOX_PARAMS = ["f", "t", "v", "n", "c"];

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  if (CHORD_BOX_PARAMS.some((k) => sp[k] !== undefined)) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
    redirect(`/chord-box?${q.toString()}`);
  }
  return (
    <main className="page home">
      <section className="home-hero">
        <h1>
          Six strings, <span>five centuries</span>
        </h1>
        <p className="home-history">
          The guitar comes from a long family of plucked string instruments. In fifteenth- and sixteenth-century
          Spain the vihuela, with its flat back, figure-eight body and paired strings, shared the stage with small
          early guitars. Through the Baroque era the five-course guitar became a favourite for accompanying song and
          dance. Around 1800 players settled on six single strings, and in the 1850s the Spanish luthier Antonio de
          Torres set the larger body and fan bracing of the modern classical guitar. Steel strings, archtops and,
          from the early 1930s, electric pickups carried the instrument into jazz, blues and rock. The tools here are
          built around the result: six strings tuned E A D G B E.
        </p>
      </section>

      <section className="modules" aria-label="Tools">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="module-card">
            <h2>{m.title}</h2>
            <p>{m.text}</p>
            <span className="module-go">Open →</span>
          </Link>
        ))}
      </section>

      <p className="home-about">
        Why standard notation instead of tab? <Link href="/about">Read about the thinking behind this site →</Link>
      </p>

      <p className="home-sources">
        Further reading:{" "}
        <a href="https://www.yamaha.com/en/musical_instrument_guide/classical_guitar/structure" target="_blank" rel="noreferrer">
          Yamaha: The origins of the classical guitar
        </a>
        {" · "}
        <a href="https://www.thecollector.com/what-is-the-history-of-the-guitar/" target="_blank" rel="noreferrer">
          TheCollector: What is the history of the guitar?
        </a>
      </p>
    </main>
  );
}
