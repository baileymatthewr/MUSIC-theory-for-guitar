"use client";

import ChordBuilder, { PreviewPanel } from "./ChordBuilder";
import ChordFinder from "./ChordFinder";
import NotationView from "./NotationView";
import TuningControl from "./TuningControl";
import { type Tab, useChordStore } from "./useChordStore";

const TABS: { id: Tab; label: string; blurb: string }[] = [
  { 
    id: "grips", 
    label: "Grips", 
    blurb: "Build a chord box by clicking the neck or typing a shape." 
  },
  {
    id: "notation",
    label: "Notation",
    blurb: "Write notes on the grand staff to get a chord name and grips that play them.",
  },
  {
    id: "chord",
    label: "Chord Name",
    blurb: "Type a chord name to see grips for it, with the chord box and its grand-staff notation.",
  },
  { 
    id: "integration", 
    label: "Integration", 
    blurb: "The grip and its notation together in one image." 
  },
];

export default function ChordApp() {
  const store = useChordStore();
  const active = TABS.find((t) => t.id === store.tab)!;

  return (
    <>
      <nav className="tabs" role="tablist" aria-label="Tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={store.tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={store.tab === t.id ? "active" : ""}
            onClick={() => store.setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <p className="tab-blurb">{active.blurb}</p>
      <TuningControl store={store} />

      <div id={`panel-${store.tab}`} role="tabpanel" aria-labelledby={`tab-${store.tab}`}>
        {store.tab === "grips" && <ChordBuilder store={store} layouts={["box"]} />}
        {store.tab === "notation" && <NotationView store={store} />}
        {store.tab === "chord" && (
          <div className="chord-page">
            <ChordFinder store={store} />
            <PreviewPanel store={store} layouts={["side", "stacked"]} />
          </div>
        )}
        {store.tab === "integration" && <ChordBuilder store={store} layouts={["side", "stacked", "staff"]} />}
      </div>
    </>
  );
}
