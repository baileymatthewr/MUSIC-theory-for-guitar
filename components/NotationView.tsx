"use client";

import { useEffect, useMemo, useState } from "react";
import NotationStaff from "./NotationStaff";
import type { ChordStore, Tab } from "./useChordStore";
import VoicingCard from "./VoicingCard";
import { type Fingering, formatFingering, identifyPitches } from "@/lib/music";
import {
  type Accidental,
  type StaffNote,
  noteFromStep,
  noteLabel,
  spellNote,
  spelledNote,
  staffNotes,
} from "@/lib/staff";
import { chordToPitches, parseChordName } from "@/lib/chordName";
import { chordVoicings, exactVoicings, inGuitarRange, parseNotes, sortNotes } from "@/lib/notation";

const ACCIDENTALS: { value: Accidental; label: string; title: string; key: string }[] = [
  { value: "b", label: "♭", title: "Flat", key: "b" },
  { value: "", label: "♮", title: "Natural", key: "n" },
  { value: "#", label: "♯", title: "Sharp", key: "#" },
];
const CYCLE: Accidental[] = ["", "#", "b"];

const MAX_NOTES = 6;

export default function NotationView({ store }: { store: ChordStore }) {
  const { notes } = store;
  const [message, setMessage] = useState<string | null>(null);

  const midis = useMemo(() => notes.map((n) => n.midi), [notes]);
  const guesses = useMemo(() => identifyPitches(midis), [midis]);
  const exact = useMemo(() => exactVoicings(midis, 8), [midis]);
  const others = useMemo(
    () => (midis.length >= 2 ? chordVoicings(midis, 12, new Set(exact.map((v) => formatFingering(v.frets)))) : []),
    [midis, exact],
  );
  const currentKey = formatFingering(store.frets);
  const guess = guesses[0];
  const textValid = parseNotes(store.noteText) !== null;
  const outOfRange = notes.filter((n) => !inGuitarRange(n));

  // Keyboard: b = flat, n = natural, # or s = sharp (ignored while typing in a field).
  const { setAccidental } = store;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "b") setAccidental("b");
      else if (e.key === "n") setAccidental("");
      else if (e.key === "#" || e.key === "s") setAccidental("#");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAccidental]);

  /** Change one note's accidental without touching the current mode. */
  const cycleStep = (step: number) => {
    setMessage(null);
    const existing = notes.find((n) => n.step === step);
    if (!existing) return;
    for (let i = 1; i <= 2; i++) {
      const acc = CYCLE[(CYCLE.indexOf(existing.accidental) + i) % 3];
      const nt = noteFromStep(step, acc);
      if (inGuitarRange(nt)) {
        store.updateNotes(notes.map((n) => (n === existing ? nt : n)));
        return;
      }
    }
  };

  const toggleStep = (step: number) => {
    setMessage(null);
    const nt = noteFromStep(step, store.accidental);
    const existing = notes.find((n) => n.step === step);
    if (existing && existing.accidental === store.accidental) {
      store.updateNotes(notes.filter((n) => n !== existing));
      return;
    }
    if (!inGuitarRange(nt)) {
      setMessage(`${noteLabel(nt)} is outside the guitar's range (E2–E6).`);
      return;
    }
    if (existing) {
      store.updateNotes(notes.map((n) => (n === existing ? nt : n)));
      return;
    }
    if (notes.length >= MAX_NOTES) {
      setMessage("Six notes at most: one per string.");
      return;
    }
    store.updateNotes(sortNotes([...notes, nt]));
  };

  const pick = (frets: Fingering) => store.updateFrets(frets);

  /** Write a chord symbol onto the staff, in close position. */
  const loadChord = () => {
    const r = parseChordName(store.chordSearch);
    if (!r.ok) {
      setMessage(r.error);
      return;
    }
    setMessage(null);
    const written: StaffNote[] = chordToPitches(r.chord).map(({ midi, name }) => {
      const acc = name.slice(1);
      if (acc !== "" && acc !== "#" && acc !== "b") return spellNote(midi, false);
      const shift = acc === "#" ? 1 : acc === "b" ? -1 : 0;
      return spelledNote(name[0], acc as Accidental, Math.floor((midi - shift) / 12) - 1);
    });
    store.updateNotes(sortNotes(written));
  };
  const goTo = (tab: Tab) => store.setTab(tab);

  return (
    <div className="notation">
      <section className="panel" aria-label="Write notes">
        <div className="notation-toolbar">
          <div className="segmented" role="radiogroup" aria-label="Accidental for new notes">
            {ACCIDENTALS.map((a) => (
              <button
                key={a.title}
                type="button"
                role="radio"
                aria-checked={store.accidental === a.value}
                className={store.accidental === a.value ? "on" : ""}
                onClick={() => store.setAccidental(a.value)}
                title={`${a.title} (key: ${a.key})`}
              >
                <span className="acc-glyph">{a.label}</span> {a.title}
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <button type="button" className="link" onClick={() => store.updateNotes(staffNotes(store.frets, store.preferFlats, store.pcNames))}>
              Load current grip
            </button>
            <button type="button" className="link" onClick={() => store.updateNotes([])}>
              Clear
            </button>
          </div>
        </div>

        <form
          className="load-chord"
          onSubmit={(e) => {
            e.preventDefault();
            loadChord();
          }}
        >
          <input
            aria-label="Chord name to load"
            value={store.chordSearch}
            onChange={(e) => store.setChordSearch(e.target.value)}
            placeholder="Chord name, e.g. E7#5 or B7/D#"
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit">Load chord</button>
        </form>

        <NotationStaff
          notes={notes}
          accidental={store.accidental}
          colors={{ ink: "#1a1a1a", background: "#ffffff", root: "#c2410c" }}
          onToggleStep={toggleStep}
          onCycleStep={cycleStep}
        />

        <div className="field">
          <label htmlFor="notes">Notes</label>
          <input
            id="notes"
            className={`mono ${textValid ? "" : "invalid"}`}
            value={store.noteText}
            onChange={(e) => {
              setMessage(null);
              store.onNoteTextChange(e.target.value);
            }}
            placeholder="C3 E3 G3 C4 E4"
            spellCheck={false}
            autoComplete="off"
          />
          <p className="hint">
            Pick ♭, ♮ or ♯ (or press b, n, #), then click the staff to add a note; click it again to remove it.
            Right-click a note to switch it between ♮, ♯ and ♭. Typing works too: use # for sharp and b for flat,
            e.g. <span className="mono">F#3 Bb3 Db4</span>. Concert pitch: the low E string is E2 and the 19th fret of
            the high e is B5.
          </p>
        </div>

        {(message || outOfRange.length > 0 || notes.length > MAX_NOTES) && (
          <ul className="warnings">
            {message && <li className="warn">{message}</li>}
            {outOfRange.length > 0 && (
              <li className="warn">Out of guitar range: {outOfRange.map(noteLabel).join(", ")}</li>
            )}
            {notes.length > MAX_NOTES && <li className="warn">More than six notes can&rsquo;t be played as one grip.</li>}
          </ul>
        )}
      </section>

      <section className="panel" aria-label="Chord and grips">
        <div className="guess">
          <span className="guess-label">Chord</span>
          <span className="guess-name">{guess ? guess.name : notes.length < 2 ? "Add at least two notes" : "Not recognised"}</span>
          {guess?.omitsFifth && <span className="hint">(no 5th)</span>}
        </div>
        {guesses.length > 1 && (
          <div className="alts">
            <span className="hint">Could also be:</span>
            {guesses.slice(1, 6).map((g) => (
              <span key={g.name} className="chip small static">
                {g.name}
              </span>
            ))}
          </div>
        )}

        {notes.length > 0 && (
          <>
            <h3 className="section-title">
              Plays exactly these pitches <span className="count">{exact.length}</span>
            </h3>
            {exact.length ? (
              <div className="voicings">
                {exact.map((v) => (
                  <VoicingCard
                    key={formatFingering(v.frets)}
                    voicing={v}
                    store={store}
                    selected={formatFingering(v.frets) === currentKey}
                    onPick={pick}
                  />
                ))}
              </div>
            ) : (
              <p className="hint">
                No comfortable grip plays these exact octaves (a hand spans about 5 frets, one note per string).
              </p>
            )}

            {others.length > 0 && (
              <>
                <h3 className="section-title">
                  Other grips for {guess?.name ?? "these notes"} <span className="count">{others.length}</span>
                </h3>
                <p className="hint">Same notes in other octaves, with the same bass note where possible.</p>
                <div className="voicings">
                  {others.map((v) => (
                    <VoicingCard
                      key={formatFingering(v.frets)}
                      voicing={v}
                      store={store}
                      selected={formatFingering(v.frets) === currentKey}
                      onPick={pick}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="handoff">
              <span className="hint">
                Current grip: <span className="mono">{currentKey}</span>
              </span>
              <button type="button" onClick={() => goTo("grips")}>
                Edit in Grips
              </button>
              <button type="button" className="primary" onClick={() => goTo("integration")}>
                Open in Integration
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
