"use client";

import type { ChordStore } from "./useChordStore";
import { STRING_COUNT } from "@/lib/music";
import {
  STANDARD,
  TUNING_PRESETS,
  findPreset,
  isStandard,
  midiToNote,
  presetTuning,
  stringRange,
  tuningNotes,
} from "@/lib/tuning";

const pretty = (note: string) => note.replace("#", "♯").replace(/(?<=[A-G])b/, "♭");

/**
 * Open-string tuning, shared by every tab of the Chord Box Maker. Pick a preset, or set
 * each string on its own; the chord box always prints the tuning above the strings.
 */
export default function TuningControl({ store }: { store: ChordStore }) {
  const { tuning, setTuning } = store;
  const preset = findPreset(tuning);
  const notes = tuningNotes(tuning);

  const setString = (s: number, midi: number) => {
    const next = [...tuning];
    next[s] = midi;
    setTuning(next);
  };

  return (
    <section className={`tuning-bar ${isStandard(tuning) ? "" : "custom"}`} aria-label="Tuning">
      <div className="tuning-preset">
        <label htmlFor="tuning-preset">Tuning</label>
        <select
          id="tuning-preset"
          value={preset?.id ?? "custom"}
          onChange={(e) => {
            const p = TUNING_PRESETS.find((x) => x.id === e.target.value);
            if (p) setTuning(presetTuning(p));
          }}
        >
          {TUNING_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          {!preset && <option value="custom">Custom</option>}
        </select>
      </div>

      <div className="tuning-strings" role="group" aria-label="Open note of each string, low to high">
        {Array.from({ length: STRING_COUNT }, (_, s) => (
          <label key={s} className="tuning-string">
            <span className="tuning-string-num">{STRING_COUNT - s}</span>
            <select
              value={tuning[s]}
              onChange={(e) => setString(s, Number(e.target.value))}
              aria-label={`String ${STRING_COUNT - s} open note`}
              className={tuning[s] !== STANDARD[s] ? "changed" : ""}
            >
              {stringRange(s).map((m) => (
                <option key={m} value={m}>
                  {pretty(m === tuning[s] ? notes[s] : midiToNote(m))}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {!isStandard(tuning) && (
        <button type="button" className="link" onClick={() => setTuning(STANDARD)}>
          Back to standard
        </button>
      )}
    </section>
  );
}
