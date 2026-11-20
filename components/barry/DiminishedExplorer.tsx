"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { type Fingering, formatFingering, planFingering } from "@/lib/music";
import { DEFAULT_OPTIONS, type DiagramOptions, renderChordSvg } from "@/lib/diagram";
import { renderLayout } from "@/lib/compose";
import {
  KEYS,
  SCALES,
  STRING_SETS,
  type ScaleChord,
  type ScaleType,
  chordBoxHref,
  diminishedFamily,
  harmonize,
  scaleNotes,
  scalePcNames,
} from "@/lib/barryHarris";

const DIM_COLORS = { ...DEFAULT_OPTIONS.colors, dot: "#c2410c", dotText: "#ffffff" };

function display(name: string): string {
  return name.replace(/b(?=\d|°|m|$|\/)/g, "♭").replace(/([A-G])#/g, "$1♯").replace(/([A-G])b/g, "$1♭");
}

function diagramOpts(frets: Fingering, title: string, pcNames: string[], dim: boolean): DiagramOptions {
  const plan = planFingering(frets);
  return {
    ...DEFAULT_OPTIONS,
    title,
    barre: plan.barre,
    pcNames,
    colors: dim ? DIM_COLORS : DEFAULT_OPTIONS.colors,
  };
}

function GripCard({
  frets,
  name,
  sub,
  pcNames,
  dim,
  withStaff,
  selected,
  onClick,
}: {
  frets: Fingering;
  name: string;
  sub?: string;
  pcNames: string[];
  dim: boolean;
  withStaff: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const opts = diagramOpts(frets, "", pcNames, dim);
  const fingers = planFingering(frets).fingers;
  const svg = withStaff
    ? renderLayout("stacked", frets, fingers, opts, { preferFlats: false, root: null, highlightRoot: false, colors: opts.colors, pcNames }, 1).svg
    : renderChordSvg(frets, fingers, opts, 1).svg;
  const body = (
    <>
      <span className="bh-card-name">{display(name)}</span>
      <span className="bh-card-img" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="bh-card-key mono">{formatFingering(frets)}</span>
      {sub && <span className="bh-card-sub">{sub}</span>}
    </>
  );
  return onClick ? (
    <button type="button" className={`bh-card ${dim ? "dim" : ""} ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      {body}
    </button>
  ) : (
    <div className={`bh-card ${dim ? "dim" : ""}`}>{body}</div>
  );
}

export default function DiminishedExplorer() {
  const [key, setKey] = useState<string>("C");
  const [type, setType] = useState<ScaleType>("major6");
  const [setId, setSetId] = useState("d2-top");
  const [withStaff, setWithStaff] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  // Remember the settings in the address, like the Chord Box Maker does.
  const searchParams = useSearchParams();
  const loaded = useRef(false);
  useEffect(() => {
    const p = new URLSearchParams(searchParams.toString());
    loaded.current = true;
    const k = p.get("key");
    if (k && (KEYS as readonly string[]).includes(k)) setKey(k);
    const t = p.get("scale") as ScaleType | null;
    if (t && t in SCALES) setType(t);
    const s = p.get("set");
    if (s && STRING_SETS.some((x) => x.id === s)) setSetId(s);
    if (p.get("staff") === "1") setWithStaff(true);
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    const p = new URLSearchParams({ key, scale: type, set: setId });
    if (withStaff) p.set("staff", "1");
    window.history.replaceState(null, "", `?${p.toString()}`);
  }, [key, type, setId, withStaff]);

  const set = STRING_SETS.find((s) => s.id === setId)!;
  const notes = useMemo(() => scaleNotes(key, type), [key, type]);
  const pcNames = useMemo(() => scalePcNames(key, type), [key, type]);
  const chords = useMemo(() => harmonize(key, type, set), [key, type, set]);
  const home = notes.filter((n) => n.home);
  const dimNotes = notes.filter((n) => !n.home);
  const homeName = `${notes[0].name}${SCALES[type].suffix}`;
  const dimName = `${dimNotes[0].name}°7`;

  // Default selection: the first diminished grip without open strings, so all four
  // half-step moves are available.
  const defaultIndex = useMemo(() => {
    const i = chords.findIndex((c) => !c.home && c.frets.every((f) => f === null || f > 0));
    return i >= 0 ? i : 0;
  }, [chords]);
  const current: ScaleChord | undefined = chords[selected ?? defaultIndex] ?? chords[0];
  useEffect(() => setSelected(null), [key, type, setId]);

  const family = useMemo(
    () => (current && !current.home ? diminishedFamily(current.frets, key, type) : null),
    [current, key, type],
  );

  const big = current
    ? renderLayout(
        "side",
        current.frets,
        planFingering(current.frets).fingers,
        diagramOpts(current.frets, display(current.name), pcNames, !current.home),
        { preferFlats: false, root: null, highlightRoot: false, colors: (current.home ? DEFAULT_OPTIONS.colors : DIM_COLORS), pcNames },
        2,
      )
    : null;

  // Same notes, other name: a major 6th is its relative minor 7th, a minor 6th is a m7♭5.
  const alias =
    current?.home && (type === "major6" || type === "minor6")
      ? type === "major6"
        ? `${pcNames[(notes[0].pc + 9) % 12]}m7`
        : `${pcNames[(notes[0].pc + 9) % 12]}m7b5`
      : null;

  return (
    <div className="bh">
      <section className="panel bh-controls" aria-label="Settings">
        <div className="field">
          <label htmlFor="bh-key">Key</label>
          <select id="bh-key" value={key} onChange={(e) => setKey(e.target.value)}>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {display(k)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bh-scale">Scale</label>
          <select id="bh-scale" value={type} onChange={(e) => setType(e.target.value as ScaleType)}>
            {(Object.keys(SCALES) as ScaleType[]).map((t) => (
              <option key={t} value={t}>
                {SCALES[t].label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="bh-set">Voicing and strings</label>
          <select id="bh-set" value={setId} onChange={(e) => setSetId(e.target.value)}>
            {STRING_SETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <label className="bh-check">
          <input type="checkbox" checked={withStaff} onChange={(e) => setWithStaff(e.target.checked)} />
          Show notation under each grip
        </label>
      </section>

      <section className="panel bh-scale" aria-label="Scale notes">
        <div className="bh-notes">
          {notes.map((n) => (
            <span key={n.degree} className={`bh-note ${n.home ? "" : "dim"}`}>
              <strong>{display(n.name)}</strong>
              <sub>{n.degree}</sub>
            </span>
          ))}
        </div>
        <p className="hint">
          <strong>{display(homeName)}</strong> = {home.map((n) => display(n.name)).join(" ")} ·{" "}
          <strong className="bh-dim-text">{display(dimName)}</strong> = {dimNotes.map((n) => display(n.name)).join(" ")}.{" "}
          {set.voicing === "drop2"
            ? "Drop 2: the second voice from the top of each close-position chord is moved down an octave."
            : "Drop 3: the third voice from the top is moved down an octave, skipping a string."}
        </p>
      </section>

      <section className="panel" aria-label="Grips up the neck">
        <h2 className="section-title">
          {display(SCALES[type].label.replace("diminished", ""))} diminished in {display(key)} · {set.label}{" "}
          <span className="count">{chords.length}</span>
        </h2>
        <p className="hint">Each scale note is the top voice in turn, from the lowest grip up to the 17th fret.</p>
        <div className="bh-grid">
          {chords.map((c, i) => (
            <GripCard
              key={`${formatFingering(c.frets)}-${i}`}
              frets={c.frets}
              name={c.name}
              sub={`top ${display(c.top)}`}
              pcNames={pcNames}
              dim={!c.home}
              withStaff={withStaff}
              selected={c === current}
              onClick={() => setSelected(i)}
            />
          ))}
        </div>
      </section>

      {current && big && (
        <section className="panel bh-detail" aria-label="Selected grip">
          <div className="bh-detail-main">
            <div className="bh-detail-img" dangerouslySetInnerHTML={{ __html: big.svg }} />
            <div className="bh-detail-text">
              <h2>{display(current.name)}</h2>
              <p className="mono">{formatFingering(current.frets)}</p>
              <p>
                {current.home ? (
                  <>
                    A grip of the home chord, {display(homeName)}, with {display(current.bass)} in the bass and{" "}
                    {display(current.top)} on top.
                    {alias && <> The same four notes also spell {display(alias)}.</>}
                  </>
                ) : (
                  <>
                    The diminished chord, {display(dimName)}. Because it is symmetrical, every inversion is the same chord.
                    Moving any one note a half step turns it into a different chord, shown below.
                  </>
                )}
              </p>
              <Link className="button-link" href={chordBoxHref(current.frets, display(current.name))}>
                Open in Chord Box Maker →
              </Link>
            </div>
          </div>

          {family && (
            <>
              <h3 className="section-title">Lower one note a half step → dominant 7th</h3>
              <div className="bh-grid">
                {family.dominants.map((r) => (
                  <Link key={formatFingering(r.frets)} href={chordBoxHref(r.frets, display(r.name))} className="bh-link">
                    <GripCard frets={r.frets} name={r.name} sub={display(r.move)} pcNames={pcNames} dim={false} withStaff={withStaff} />
                  </Link>
                ))}
              </div>
              <h3 className="section-title">Raise one note a half step → minor 6th</h3>
              <div className="bh-grid">
                {family.minors.map((r) => (
                  <Link key={formatFingering(r.frets)} href={chordBoxHref(r.frets, display(r.name))} className="bh-link">
                    <GripCard frets={r.frets} name={r.name} sub={display(r.move)} pcNames={pcNames} dim={false} withStaff={withStaff} />
                  </Link>
                ))}
              </div>
              {(family.dominants.length < 4 || family.minors.length < 4) && (
                <p className="hint">Some moves are missing because they would need a fret below an open string.</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
