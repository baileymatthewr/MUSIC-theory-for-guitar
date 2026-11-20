"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import VoicingCard from "./VoicingCard";
import type { ChordStore } from "./useChordStore";
import { chordPcNames, chordQuery, parseChordName } from "@/lib/chordName";
import { searchVoicings } from "@/lib/notation";
import { formatFingering } from "@/lib/music";

const EXAMPLES = ["A", "A Maj 7", "D#o7", "E7#5", "B7/D#", "Cm7b5", "G13", "F#m11"];
const FIRST_PAGE = 12;

/** Type a chord symbol, get grips for it. */
export default function ChordFinder({ store }: { store: ChordStore }) {
  const [showAll, setShowAll] = useState(false);
  const text = store.chordSearch;
  const parsed = useMemo(() => (text.trim() ? parseChordName(text) : null), [text]);
  const result = useMemo(
    () => (parsed?.ok ? searchVoicings(chordQuery(parsed.chord), 24) : null),
    [parsed],
  );
  const chord = parsed?.ok ? parsed.chord : null;
  const voicings = result?.voicings ?? [];
  const shown = showAll ? voicings : voicings.slice(0, FIRST_PAGE);
  const currentKey = formatFingering(store.frets);
  const pcNames = useMemo(() => (chord ? chordPcNames(chord) : undefined), [chord]);

  // When a new chord is typed or picked, show its best grip straight away.
  const lastPicked = useRef<string | null>(null);
  const { updateFrets } = store;
  useEffect(() => {
    if (!chord || !voicings.length || lastPicked.current === chord.input) return;
    lastPicked.current = chord.input;
    if (voicings.some((v) => formatFingering(v.frets) === currentKey) && store.title === chord.input) return;
    updateFrets(voicings[0].frets, chord.input, pcNames);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chord, voicings]);

  return (
    <section className="panel finder" aria-label="Find grips by chord name">
      <div className="finder-head">
        <div className="field finder-field">
          <label htmlFor="chord-search">Find by chord name</label>
          <input
            id="chord-search"
            value={text}
            onChange={(e) => {
              store.setChordSearch(e.target.value);
              setShowAll(false);
            }}
            placeholder="e.g. A, A Maj 7, D#o7, E7#5, B7/D#"
            spellCheck={false}
            autoComplete="off"
            className={parsed && !parsed.ok ? "invalid" : ""}
          />
        </div>
        <div className="presets finder-examples" aria-label="Examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="chip small" onClick={() => store.setChordSearch(ex)}>
              {ex}
            </button>
          ))}
          {text && (
            <button type="button" className="chip small ghost" onClick={() => store.setChordSearch("")}>
              Clear
            </button>
          )}
        </div>
      </div>

      {parsed && !parsed.ok && <p className="finder-error">{parsed.error}</p>}

      {chord && (
        <>
          <p className="finder-notes">
            <span className="finder-name">{chord.input}</span>
            <span className="mono">
              {chord.tones.map((t, i) => (
                <span key={t.label} className={t.required ? "" : "optional"} title={t.required ? undefined : "optional"}>
                  {chord.noteNames[i]}
                  <sub>{t.label}</sub>{" "}
                </span>
              ))}
              {chord.bassName && chord.noteNames.length > chord.tones.length && (
                <span>
                  / {chord.bassName}
                  <sub>bass</sub>
                </span>
              )}
            </span>
          </p>
          <p className="hint">
            {chord.tones.some((t) => !t.required) && "Faded notes may be left out. "}
            {result && !result.keptBass && `No playable grip keeps ${chord.bassName ?? chord.rootName} lowest, so these use other bass notes. `}
            Click a grip to show it with its notation; the box is titled &ldquo;{chord.input}&rdquo;.
          </p>
          {voicings.length ? (
            <div className="voicings">
              {shown.map((v) => {
                const key = formatFingering(v.frets);
                return (
                  <VoicingCard
                    key={key}
                    voicing={v}
                    store={store}
                    selected={key === currentKey}
                    onPick={(frets) => store.updateFrets(frets, chord.input, pcNames)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="hint">No playable grip found for this chord in standard tuning.</p>
          )}
          {voicings.length > FIRST_PAGE && (
            <button type="button" className="link finder-more" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show fewer" : `Show all ${voicings.length}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
