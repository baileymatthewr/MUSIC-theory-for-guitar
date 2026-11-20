import type { Metadata } from "next";
import { Suspense } from "react";
import ChordApp from "@/components/ChordApp";

export const metadata: Metadata = {
  title: "Chord Box Maker",
  description: "Build guitar chord diagrams for standard tuning and export them as images.",
};

export default function ChordBoxPage() {
  return (
    <main className="page">
      <header className="masthead">
        <h1>
          Chord Box <span>Maker</span>
        </h1>
      </header>
      <Suspense>
        <ChordApp />
      </Suspense>
    </main>
  );
}
