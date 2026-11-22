import { Suspense } from "react";
import BarryNav from "@/components/barry/BarryNav";

export default function BarryHarrisLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="page">
      <header className="masthead">
        <h1>
          Barry Harris <span>Diminished</span>
        </h1>
      </header>
      <Suspense>
        <BarryNav />
      </Suspense>
      {children}
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
