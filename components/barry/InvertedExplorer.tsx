"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { type ScaleType, chordBoxHref, contraryMotion, motionStarts, scaleNotes, scalePcNames } from "@/lib/barryHarris";
import KeyScalePicker, { validKeyScale } from "./KeyScalePicker";
import GripCard, { display } from "./GripCard";
import { useUrlState } from "./useUrlState";

/** Contrary motion: the top voice climbs and the bass falls, one scale note per step. */
export default function InvertedExplorer() {
  const [s, set] = useUrlState({ key: "C", scale: "major6", start: "6", staff: "1" }, (k, v) =>
    k === "start" ? ["0", "2", "4", "6"].includes(v) : k === "staff" ? v === "0" || v === "1" : validKeyScale(String(k), v),
  );
  const key = s.key;
  const type = s.scale as ScaleType;
  const start = Number(s.start);
  const withStaff = s.staff === "1";

  const pcNames = useMemo(() => scalePcNames(key, type), [key, type]);
  const starts = useMemo(() => motionStarts(key, type), [key, type]);
  const steps = useMemo(() => contraryMotion(key, type, start), [key, type, start]);
  const notes = scaleNotes(key, type);

  return (
    <div className="bh">
      <section className="panel bh-controls" aria-label="Settings">
        <KeyScalePicker keyName={key} type={type} onKey={(k) => set("key", k)} onType={(t) => set("scale", t)} />
        <div className="field">
          <label htmlFor="bh-start">Start from</label>
          <select id="bh-start" value={start} onChange={(e) => set("start", e.target.value)}>
            {starts.map((st) => (
              <option key={st.index} value={st.index}>
                {display(st.label)} (close position)
              </option>
            ))}
          </select>
        </div>
        <label className="bh-check">
          <input type="checkbox" checked={withStaff} onChange={(e) => set("staff", e.target.checked ? "1" : "0")} />
          Show notation under each grip
        </label>
      </section>

      <section className="panel" aria-label="Contrary motion">
        <h2 className="section-title">
          Contrary motion from {display(starts.find((x) => x.index === start)?.label ?? "")} <span className="count">{steps.length}</span>
        </h2>
        <p className="hint">
          Each step the <strong>top note moves up</strong> one scale note and the <strong>bass moves down</strong> one; the
          two inner notes each move one scale note to complete the next chord. Home chords (dark) and{" "}
          <span className="bh-dim-text">diminished chords</span> (orange) alternate as the grip opens out, until it can no
          longer be played. When the top and bass reach the same note an octave or more apart, it is doubled, so that
          chord has three different notes. Click a grip to open it in the Chord Box Maker.
        </p>
        {steps.length ? (
          <div className="bh-motion">
            {steps.map((st, i) => (
              <Fragment key={i}>
                {i > 0 && (
                  <span className="bh-arrow" aria-hidden>
                    →
                  </span>
                )}
                <Link href={chordBoxHref(st.frets, display(st.name))} className="bh-link">
                  <GripCard
                    frets={st.frets}
                    name={st.name}
                    sub={`${display(st.noteNames[0])} … ${display(st.noteNames[3])}`}
                    pcNames={pcNames}
                    dim={!st.home}
                    withStaff={withStaff}
                  />
                </Link>
              </Fragment>
            ))}
          </div>
        ) : (
          <p className="hint">No playable grip found for this starting chord.</p>
        )}
        {steps.length > 0 && (
          <p className="hint bh-motion-notes">
            Bass: {steps.map((st) => display(st.noteNames[0])).join(" → ")} · Top:{" "}
            {steps.map((st) => display(st.noteNames[3])).join(" → ")}
          </p>
        )}
        <p className="hint">
          Scale: {notes.map((nt) => display(nt.name)).join(" ")}
        </p>
      </section>
    </div>
  );
}
