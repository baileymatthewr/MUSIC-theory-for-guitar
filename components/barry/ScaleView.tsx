"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SCALES, type ScaleType, scaleNotes, scaleStaffNotes } from "@/lib/barryHarris";
import { renderSequenceSvg } from "@/lib/staff";
import { renderNeckMap } from "@/lib/neckMap";
import KeyScalePicker, { validKeyScale } from "./KeyScalePicker";
import { display } from "./GripCard";
import { useUrlState } from "./useUrlState";

const INK = "#1a1a1a";
const DIM = "#c2410c";

/** The scale by itself: its notes, written on the staff, and mapped over the whole neck. */
export default function ScaleView() {
  const [s, set] = useUrlState({ key: "C", scale: "major6" }, validKeyScale);
  const key = s.key;
  const type = s.scale as ScaleType;
  const notes = useMemo(() => scaleNotes(key, type), [key, type]);
  const homeName = `${notes[0].name}${SCALES[type].suffix}`;
  const dimName = `${notes[1].name}°7`;

  const staff = useMemo(
    () => renderSequenceSvg(scaleStaffNotes(key, type), (i) => (i % 2 === 0 ? INK : DIM), { ink: INK, background: "#ffffff", root: DIM }, 1),
    [key, type],
  );
  const neck = useMemo(() => {
    const marks = Array<null | { label: string; fill: string; text: string }>(12).fill(null);
    for (const nt of notes) marks[nt.pc] = { label: display(nt.name), fill: nt.home ? INK : DIM, text: "#ffffff" };
    return renderNeckMap({ marks, background: "#ffffff" });
  }, [notes]);
  const q = `?key=${encodeURIComponent(key)}&scale=${type}`;

  return (
    <div className="bh">
      <section className="panel bh-controls" aria-label="Settings">
        <KeyScalePicker keyName={key} type={type} onKey={(k) => set("key", k)} onType={(t) => set("scale", t)} />
      </section>

      <section className="panel bh-scale" aria-label="Scale notes">
        <h2 className="section-title">
          {display(key)} {SCALES[type].label.toLowerCase()}
        </h2>
        <div className="bh-notes">
          {notes.map((n) => (
            <span key={n.degree} className={`bh-note ${n.home ? "" : "dim"}`}>
              <strong>{display(n.name)}</strong>
              <sub>{n.degree}</sub>
            </span>
          ))}
        </div>
        <p className="hint">
          The dark notes are the home chord, <strong>{display(homeName)}</strong> ({notes.filter((n) => n.home).map((n) => display(n.name)).join(" ")}).
          The orange notes are the diminished chord, <strong className="bh-dim-text">{display(dimName)}</strong> (
          {notes.filter((n) => !n.home).map((n) => display(n.name)).join(" ")}), which sits between them.
        </p>
        <div className="bh-figure" dangerouslySetInnerHTML={{ __html: staff.svg.replace(/ width="[^"]+" height="[^"]+"/, ' width="100%"') }} style={{ maxWidth: staff.width * 2 }} />
      </section>

      <section className="panel" aria-label="The scale on the neck">
        <h2 className="section-title">On the neck, to the 15th fret</h2>
        <p className="hint">High e is on top, as in tab. Notes left of the nut are the open strings.</p>
        <div className="bh-neck" dangerouslySetInnerHTML={{ __html: neck.svg.replace(/ width="[^"]+" height="[^"]+"/, ' width="100%"') }} />
      </section>

      <section className="bh-next" aria-label="Next">
        <Link href={`/barry-harris/scale-grips${q}`} className="module-card">
          <h2>Scale grips →</h2>
          <p>Harmonise each note of the scale: the home chord and the diminished chord alternate as you climb the neck.</p>
        </Link>
        <Link href={`/barry-harris/inverted-grips${q}`} className="module-card">
          <h2>Inverted grips →</h2>
          <p>Contrary motion: the top note climbs and the bass falls, one scale note at a time, so the grips spread wider.</p>
        </Link>
      </section>
    </div>
  );
}
