"use client";

import type { ChordStore } from "./useChordStore";
import { type Fingering, formatFingering, planFingering } from "@/lib/music";
import { renderChordSvg, THEMES } from "@/lib/diagram";
import type { Voicing } from "@/lib/notation";

/** A small clickable chord box, used for grip suggestions. */
export default function VoicingCard({
  voicing,
  store,
  selected,
  onPick,
}: {
  voicing: Voicing;
  store: ChordStore;
  selected: boolean;
  onPick: (frets: Fingering) => void;
}) {
  const plan = planFingering(voicing.frets);
  const barre = plan.barre;
  const { svg } = renderChordSvg(
    voicing.frets,
    plan.fingers,
    {
      ...store.diagramOptions,
      title: "",
      bottomLabel: "none",
      barre: store.drawBarre ? barre : null,
      colors: THEMES.classic,
    },
    1,
  );
  const key = formatFingering(voicing.frets);
  return (
    <button
      type="button"
      className={`voicing ${selected ? "selected" : ""}`}
      onClick={() => onPick(voicing.frets)}
      aria-pressed={selected}
      aria-label={`Use grip ${key}`}
    >
      <span className="voicing-img" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="voicing-key mono">{key}</span>
    </button>
  );
}

