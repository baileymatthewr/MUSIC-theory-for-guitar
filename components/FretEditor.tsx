"use client";

import { DOUBLE_INLAYS, type Finger, type Fingering, type Fingers, SINGLE_INLAYS, STRING_COUNT, type Tuning, midiAt, pitchClassName } from "@/lib/music";
import { STANDARD, tuningLetters } from "@/lib/tuning";


interface Props {
  frets: Fingering;
  fingers: Fingers;
  neckLength: number;
  leftHanded: boolean;
  preferFlats: boolean;
  pcNames?: string[];
  tuning?: Tuning;
  onFretsChange: (frets: Fingering) => void;
  onFingerChange: (string: number, finger: Finger | null) => void;
}

/**
 * Clickable neck, drawn vertically like a chord box so it reads the same way as the output.
 * Click a fret to place a note; click it again to make the string open.
 * The row above the nut toggles open ↔ muted.
 */
export default function FretEditor({
  frets,
  fingers,
  neckLength,
  leftHanded,
  preferFlats,
  pcNames,
  tuning = STANDARD,
  onFretsChange,
  onFingerChange,
}: Props) {
  // String names come from the tuning (e.g. D A D G A D for DADGAD).
  const STRING_NAMES = tuningLetters(tuning).map((n) => n.replace("#", "♯").replace(/(?<=[A-G])b/, "♭"));
  const order = Array.from({ length: STRING_COUNT }, (_, i) => (leftHanded ? STRING_COUNT - 1 - i : i));

  const setString = (s: number, value: number | null) => {
    const next = [...frets];
    next[s] = value;
    onFretsChange(next);
  };

  const toggleTop = (s: number) => setString(s, frets[s] === 0 ? null : 0);
  const clickFret = (s: number, f: number) => setString(s, frets[s] === f ? 0 : f);

  return (
    <div className="editor" role="grid" aria-label="Fretboard editor">
      <div className="editor-row editor-head" role="row">
        <span className="fret-num" />
        {order.map((s) => (
          <span key={s} className="string-name" role="columnheader">
            {STRING_NAMES[s]}
          </span>
        ))}
      </div>

      <div className="editor-row editor-markers" role="row">
        <span className="fret-num" />
        {order.map((s) => {
          const f = frets[s];
          const label = f === null ? "✕" : f === 0 ? "○" : "·";
          return (
            <button
              key={s}
              type="button"
              className={`marker ${f === null ? "is-muted" : f === 0 ? "is-open" : ""}`}
              onClick={() => toggleTop(s)}
              aria-label={`${STRING_NAMES[s]} string: ${f === null ? "muted" : f === 0 ? "open" : `fret ${f}`}. Toggle open or muted.`}
              title={f === null ? "Muted — click for open" : "Click to mute"}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="neck-scroll">
      <div className="neck">
        {Array.from({ length: neckLength }, (_, i) => i + 1).map((f) => (
          <div key={f} className={`editor-row fret-row ${f === 1 ? "first" : ""}`} role="row">
            <span className="fret-num">{f}</span>
            {DOUBLE_INLAYS.has(f) ? (
              <>
                <i className="inlay" style={{ left: "calc(var(--num-w) + 2 * var(--cell-w))" }} aria-hidden />
                <i className="inlay" style={{ left: "calc(var(--num-w) + 4 * var(--cell-w))" }} aria-hidden />
              </>
            ) : SINGLE_INLAYS.has(f) ? (
              <i className="inlay" style={{ left: "calc(var(--num-w) + 3 * var(--cell-w))" }} aria-hidden />
            ) : null}
            {order.map((s) => {
              const active = frets[s] === f;
              const pc = midiAt(s, f, tuning) % 12;
              const note = pcNames?.[pc] ?? pitchClassName(pc, preferFlats);
              return (
                <button
                  key={s}
                  type="button"
                  role="gridcell"
                  className={`cell ${active ? "active" : ""}`}
                  onClick={() => clickFret(s, f)}
                  aria-pressed={active}
                  aria-label={`${STRING_NAMES[s]} string, fret ${f} (${note})`}
                >
                  <span className="cell-dot">{active ? note : ""}</span>
                  <span className="cell-hint">{note}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      </div>

      <div className="editor-row finger-row" role="row">
        <span className="fret-num" title="Finger">
          ☝︎
        </span>
        {order.map((s) => {
          const disabled = frets[s] === null || frets[s] === 0;
          return (
            <select
              key={s}
              className="finger-select"
              value={disabled ? "" : (fingers[s] ?? "")}
              disabled={disabled}
              onChange={(e) => {
                const v = e.target.value;
                onFingerChange(s, v === "T" ? "T" : v ? Number(v) : null);
              }}
              aria-label={`Finger for ${STRING_NAMES[s]} string`}
            >
              <option value="">–</option>
              <option value="T">T</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          );
        })}
      </div>
    </div>
  );
}
