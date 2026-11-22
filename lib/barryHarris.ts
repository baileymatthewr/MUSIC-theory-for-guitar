/**
 * Barry Harris's diminished scales: a four-note chord (major 6th, minor 6th, dominant 7th or
 * 7♭5) interleaved with the diminished 7th chord built on the scale's 2nd degree. Stacking every
 * other scale note alternates the two chords, so harmonising the eight notes in turn gives the
 * chord, the diminished chord, the chord, … through all their inversions.
 */
import { type Fingering, STANDARD_TUNING, formatFingering, pitchClassName, planFingering, playabilityWarnings } from "./music.ts";
import { exactVoicings } from "./notation.ts";
import { type StaffNote, spelledNote, spellNote } from "./staff.ts";

export type ScaleType = "major6" | "minor6" | "dom7" | "dom7b5";

interface ScaleDef {
  label: string;
  /** Chord suffix for the "home" chord, e.g. "6". */
  suffix: string;
  /** Semitones above the root for the eight scale notes. */
  semis: number[];
  /** Letter steps above the root letter for each scale note (two notes share a letter). */
  letters: number[];
  /** Interval labels. */
  degrees: string[];
}

export const SCALES: Record<ScaleType, ScaleDef> = {
  major6: {
    label: "Major 6th diminished",
    suffix: "6",
    semis: [0, 2, 4, 5, 7, 8, 9, 11],
    letters: [0, 1, 2, 3, 4, 5, 5, 6],
    degrees: ["1", "2", "3", "4", "5", "b6", "6", "7"],
  },
  minor6: {
    label: "Minor 6th diminished",
    suffix: "m6",
    semis: [0, 2, 3, 5, 7, 8, 9, 11],
    letters: [0, 1, 2, 3, 4, 5, 5, 6],
    degrees: ["1", "2", "b3", "4", "5", "b6", "6", "7"],
  },
  dom7: {
    label: "Dominant 7th diminished",
    suffix: "7",
    semis: [0, 2, 4, 5, 7, 8, 10, 11],
    letters: [0, 1, 2, 3, 4, 5, 6, 6],
    degrees: ["1", "2", "3", "4", "5", "b6", "b7", "7"],
  },
  dom7b5: {
    label: "Dominant 7♭5 diminished",
    suffix: "7b5",
    semis: [0, 2, 4, 5, 6, 8, 10, 11],
    letters: [0, 1, 2, 3, 4, 5, 6, 6],
    degrees: ["1", "2", "3", "4", "b5", "b6", "b7", "7"],
  },
};

/** Keys offered, with their usual spelling. */
export const KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"] as const;

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

/** Sharp keys spell borrowed notes with sharps; C and the flat keys use flats. */
function keyFlats(key: string): boolean {
  return !["G", "D", "A", "E", "B", "F#"].includes(key);
}

function keyPc(key: string): number {
  const base = LETTER_PC[LETTERS.indexOf(key[0])];
  return (base + (key[1] === "#" ? 1 : key[1] === "b" ? -1 : 0) + 12) % 12;
}

export interface ScaleNote {
  pc: number;
  name: string;
  degree: string;
  /** True for notes of the home chord (1st, 3rd, 5th, 7th scale notes); false for the diminished chord. */
  home: boolean;
}

/** The eight notes of the scale, spelled from the key (double sharps/flats fall back to plain names). */
export function scaleNotes(key: string, type: ScaleType): ScaleNote[] {
  const def = SCALES[type];
  const root = keyPc(key);
  const rootLetter = LETTERS.indexOf(key[0]);
  const flats = keyFlats(key);
  return def.semis.map((semi, i) => {
    const pc = (root + semi) % 12;
    const li = (rootLetter + def.letters[i]) % 7;
    const diff = ((pc - LETTER_PC[li] + 18) % 12) - 6;
    const name =
      diff === 0 ? LETTERS[li] : diff === 1 ? `${LETTERS[li]}#` : diff === -1 ? `${LETTERS[li]}b` : pitchClassName(pc, flats);
    return { pc, name, degree: def.degrees[i], home: i % 2 === 0 };
  });
}

/** Spelling per pitch class (0–11) for the staff and note labels. */
export function scalePcNames(key: string, type: ScaleType): string[] {
  const flats = keyFlats(key);
  const names = Array.from({ length: 12 }, (_, pc) => pitchClassName(pc, flats));
  for (const n of scaleNotes(key, type)) names[n.pc] = n.name;
  return names;
}

// ---------------------------------------------------------------------------
// Voicings
// ---------------------------------------------------------------------------

export type Voicing = "drop2" | "drop3";

export interface StringSet {
  id: string;
  label: string;
  voicing: Voicing;
  /** String indices low → high (0 = low E). */
  strings: number[];
}

export const STRING_SETS: StringSet[] = [
  { id: "d2-top", label: "Drop 2 · strings 4-3-2-1", voicing: "drop2", strings: [2, 3, 4, 5] },
  { id: "d2-mid", label: "Drop 2 · strings 5-4-3-2", voicing: "drop2", strings: [1, 2, 3, 4] },
  { id: "d2-low", label: "Drop 2 · strings 6-5-4-3", voicing: "drop2", strings: [0, 1, 2, 3] },
  { id: "d3-low", label: "Drop 3 · strings 6-4-3-2", voicing: "drop3", strings: [0, 2, 3, 4] },
  { id: "d3-mid", label: "Drop 3 · strings 5-3-2-1", voicing: "drop3", strings: [1, 3, 4, 5] },
];

export interface ScaleChord {
  frets: Fingering;
  /** Sounding pitches low → high. */
  midis: number[];
  /** Index (0–7) of the scale note on top. */
  topIndex: number;
  /** True for the home chord (6th / 7th), false for the diminished chord. */
  home: boolean;
  name: string;
  /** Bass note name. */
  bass: string;
  /** Melody (top) note name. */
  top: string;
}

/**
 * Harmonise every scale note on one string set, from the lowest playable grip up the neck
 * to `maxFret`. Each scale note is the top voice; the chord under it is the home chord or
 * the diminished chord in close position, then "dropped" (drop 2: the second voice from the
 * top goes down an octave; drop 3: the third voice from the top).
 */
export function harmonize(key: string, type: ScaleType, set: StringSet, maxFret = 17): ScaleChord[] {
  const notes = scaleNotes(key, type);
  const pcs = notes.map((n) => n.pc);
  const root = notes[0];
  const suffix = SCALES[type].suffix;
  const top = set.strings[3];
  const open = STANDARD_TUNING[top];

  // Scale pitches on the top string, ascending.
  const tops: { midi: number; index: number }[] = [];
  for (let midi = open; midi <= open + maxFret; midi++) {
    const index = pcs.indexOf(midi % 12);
    if (index >= 0) tops.push({ midi, index });
  }

  const out: ScaleChord[] = [];
  for (const { midi, index } of tops) {
    // Close position under the top note: the chord tones 2, 4 and 6 scale steps below.
    const close = [midi];
    for (let k = 1; k <= 3; k++) {
      const pc = pcs[(index - 2 * k + 16) % 8];
      let m = close[0] - 1;
      while (m % 12 !== pc) m--;
      close.unshift(m);
    }
    // close = [v0, v1, v2, v3] low → high
    const [v0, v1, v2, v3] = close;
    const voices = set.voicing === "drop2" ? [v2 - 12, v0, v1, v3] : [v1 - 12, v0, v2, v3];
    const frets: Fingering = [null, null, null, null, null, null];
    let ok = true;
    voices.forEach((v, k) => {
      const f = v - STANDARD_TUNING[set.strings[k]];
      if (f < 0 || f > maxFret) ok = false;
      frets[set.strings[k]] = f;
    });
    if (!ok) continue;
    const fretted = frets.filter((f): f is number => f !== null && f > 0);
    if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 4) continue;
    if (playabilityWarnings(frets, planFingering(frets)).some((w) => w.level === "warn")) continue;

    const home = index % 2 === 0;
    const bassNote = notes[pcs.indexOf(voices[0] % 12)];
    const name = home
      ? `${root.name}${suffix}${bassNote.pc === root.pc ? "" : `/${bassNote.name}`}`
      : `${bassNote.name}°7`;
    out.push({
      frets,
      midis: voices,
      topIndex: index,
      home,
      name,
      bass: bassNote.name,
      top: notes[index].name,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The diminished chord's family: lower one note → dominant 7th, raise one → minor 6th
// ---------------------------------------------------------------------------

export interface Relative {
  name: string;
  frets: Fingering;
  /** Which note moved, e.g. "A♭ → G". */
  move: string;
}

/**
 * From a diminished-7th grip, move each voice by a half step (one fret on the same string):
 * down gives a dominant 7th whose root is the lowered note; up gives a minor 6th whose root
 * is a 4th above the raised note.
 */
export function diminishedFamily(frets: Fingering, key: string, type: ScaleType): { dominants: Relative[]; minors: Relative[] } {
  const names = scalePcNames(key, type);
  const flats = keyFlats(key);
  const nm = (pc: number) => names[pc] ?? pitchClassName(pc, flats);
  const dominants: Relative[] = [];
  const minors: Relative[] = [];
  frets.forEach((f, s) => {
    if (f === null) return;
    const pc = (STANDARD_TUNING[s] + f) % 12;
    if (f >= 1) {
      const next = [...frets];
      next[s] = f - 1;
      const low = (pc + 11) % 12;
      dominants.push({ name: `${pitchClassName(low, flats)}7`, frets: next, move: `${nm(pc)} → ${pitchClassName(low, flats)}` });
    }
    const next = [...frets];
    next[s] = f + 1;
    const up = (pc + 1) % 12;
    // The raised note is the 5th of the new minor 6th chord; spell it that way (F → F♯ for Bm6).
    const root = pitchClassName((up + 5) % 12, flats);
    const li = (LETTERS.indexOf(root[0]) + 4) % 7;
    const diff = ((up - LETTER_PC[li] + 18) % 12) - 6;
    const fifth = diff === 0 ? LETTERS[li] : diff === 1 ? `${LETTERS[li]}#` : diff === -1 ? `${LETTERS[li]}b` : pitchClassName(up, flats);
    minors.push({ name: `${root}m6`, frets: next, move: `${nm(pc)} → ${fifth}` });
  });
  const playable = (r: Relative) => !playabilityWarnings(r.frets).some((w) => w.level === "warn");
  return { dominants: dominants.filter(playable), minors: minors.filter(playable) };
}

/** Link into the Chord Box Maker with this grip and name. */
export function chordBoxHref(frets: Fingering, name: string): string {
  return `/chord-box?f=${encodeURIComponent(formatFingering(frets))}&t=${encodeURIComponent(name)}`;
}

// ---------------------------------------------------------------------------
// Inverted grips: contrary motion
// ---------------------------------------------------------------------------

export interface MotionStep {
  /** Sounding pitches low → high. */
  midis: number[];
  frets: Fingering;
  home: boolean;
  name: string;
  /** Spelled notes, low → high. */
  noteNames: string[];
}

/** Starting chords: the home chord in close position, each of its notes in turn in the bass. */
export function motionStarts(key: string, type: ScaleType): { index: number; label: string }[] {
  const notes = scaleNotes(key, type);
  const root = notes[0].name;
  const suffix = SCALES[type].suffix;
  return [0, 2, 4, 6].map((i) => ({
    index: i,
    label: i === 0 ? `${root}${suffix}` : `${root}${suffix}/${notes[i].name}`,
  }));
}

/**
 * Contrary motion through the scale: start from the home chord in close position, then at each
 * step move the top voice UP one scale note and the bass DOWN one, with the two inner voices each
 * moving one scale note to whichever neighbour completes the new chord. Chords alternate home /
 * diminished and the grip spreads wider every step, until it can no longer be played.
 * When the outer voices meet on the same note (an octave or more apart), that note is doubled
 * and the chord has three different notes.
 */
export function contraryMotion(key: string, type: ScaleType, startIndex = 0, maxSteps = 9): MotionStep[] {
  const notes = scaleNotes(key, type);
  const pcs = notes.map((n) => n.pc);
  const root = notes[0];
  const suffix = SCALES[type].suffix;

  // Every scale pitch from E2 to E6, low → high.
  const ladder: number[] = [];
  for (let m = STANDARD_TUNING[0]; m <= STANDARD_TUNING[5] + 24; m++) if (pcs.includes(m % 12)) ladder.push(m);
  const pcIndex = (m: number) => pcs.indexOf(m % 12);

  // Close position: the bass between C3 and B3, then the next three home notes above it.
  const startPc = pcs[startIndex];
  const bassMidi = ladder.find((m) => m >= 48 && m % 12 === startPc)!;
  let pos = [0, 2, 4, 6].map((k) => ladder.indexOf(bassMidi) + k);

  const nameFor = (midis: number[], home: boolean) => {
    const bass = notes[pcIndex(midis[0])];
    return home ? `${root.name}${suffix}${bass.pc === root.pc ? "" : `/${bass.name}`}` : `${bass.name}°7`;
  };

  const steps: MotionStep[] = [];
  let prevFrets: Fingering | null = null;
  for (let step = 0; step < maxSteps; step++) {
    // Candidate positions for this step.
    const candidates: number[][] =
      step === 0
        ? [pos]
        : [-1, 1].flatMap((d1) =>
            [-1, 1].map((d2) => [pos[0] - 1, pos[1] + d1, pos[2] + d2, pos[3] + 1]),
          );
    let best: { pos: number[]; frets: Fingering; score: number; awkward: boolean } | null = null;
    for (const c of candidates) {
      if (c[0] < 0 || c[3] >= ladder.length) continue;
      if (!(c[0] < c[1] && c[1] < c[2] && c[2] < c[3])) continue;
      const midis = c.map((i) => ladder[i]);
      const distinct = new Set(midis.map((m) => m % 12)).size;
      const grips = exactVoicings(midis, 12);
      for (const g of grips) {
        // Stay near the previous grip on the neck.
        const avg = (f: Fingering) => {
          const fr = f.filter((x): x is number => x !== null && x > 0);
          return fr.length ? fr.reduce((a, b) => a + b, 0) / fr.length : 0;
        };
        const move: number = prevFrets ? Math.abs(avg(g.frets) - avg(prevFrets)) : 0;
        // Open strings only make sense near the nut; up the neck they force big jumps.
        const fretted = g.frets.filter((x): x is number => x !== null && x > 0);
        const opens = g.frets.filter((x) => x === 0).length;
        const openPenalty = fretted.length && Math.max(...fretted) > 4 ? opens * 20 : 0;
        // The thumb is allowed, but an ordinary grip is easier when there is one.
        const thumbPenalty = planFingering(g.frets).thumbStrings.length ? 15 : 0;
        const score: number = distinct * 100 + g.score - move * 3 - openPenalty - thumbPenalty;
        if (!best || score > best.score) best = { pos: c, frets: g.frets, score, awkward: openPenalty > 0 };
      }
    }
    // Stop once the spread can only be reached with open strings far from the hand.
    if (!best || (best.awkward && step > 0)) break;
    pos = best.pos;
    prevFrets = best.frets;
    const midis = pos.map((i) => ladder[i]);
    const home = pcIndex(midis[3]) % 2 === 0;
    steps.push({ midis, frets: best.frets, home, name: nameFor(midis, home), noteNames: midis.map((m) => notes[pcIndex(m)].name) });
  }
  return steps;
}

/** The scale written out for the staff: root between C3 and B3, up to the octave (9 notes). */
export function scaleStaffNotes(key: string, type: ScaleType): StaffNote[] {
  const notes = scaleNotes(key, type);
  const rootMidi = 48 + notes[0].pc;
  return [...SCALES[type].semis, 12].map((semi, i) => {
    const nt = notes[i % 8];
    const midi = rootMidi + semi;
    const acc = nt.name.slice(1);
    if (acc !== "" && acc !== "#" && acc !== "b") return spellNote(midi, keyFlats(key));
    const shift = acc === "#" ? 1 : acc === "b" ? -1 : 0;
    return spelledNote(nt.name[0], acc, Math.floor((midi - shift) / 12) - 1);
  });
}
