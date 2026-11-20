/**
 * Chord symbols → notes. Understands the common ways of writing chords:
 *   A, Am, A-, Amin, AMaj7, A Maj 7, AΔ, A6, A69, A6/9, A7, A9, A11, A13, Asus, Asus2, A7sus4,
 *   Aadd9, A5, Adim, Ao, Ao7, Adim7, Aø, Am7b5, Aaug, A+, A7#5, A7b9, A7#9, Amaj7#11,
 *   AmMaj7, A7(b9, #11), and slash chords such as B7/D#.
 */
import { pitchClassName } from "./music.ts";
import type { VoicingQuery } from "./notation.ts";

export interface ChordTone {
  /** Semitones above the root (0–11). */
  semi: number;
  /** Scale degree above the root letter (0 = root, 1 = 2nd/9th, 2 = 3rd, … 6 = 7th). */
  degree: number;
  /** Interval name, e.g. "b3", "#5", "9". */
  label: string;
  /** False for tones a guitarist may leave out (the 5th of a 7th chord, the 9th under an 11/13). */
  required: boolean;
}

export interface ParsedChord {
  input: string;
  root: number;
  rootName: string;
  /** Slash bass, if any (may be a note outside the chord). */
  bass: number | null;
  bassName: string | null;
  tones: ChordTone[];
  /** Note names of the chord tones, root first, then the bass if it's an extra note. */
  noteNames: string[];
}

export type ParseResult = { ok: true; chord: ParsedChord } | { ok: false; error: string };

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

function parseNoteName(s: string): { pc: number; name: string; length: number } | null {
  const m = /^([A-Ga-g])(##|bb|#|b)?/.exec(s);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc = m[2] ?? "";
  const shift = acc === "#" ? 1 : acc === "##" ? 2 : acc === "b" ? -1 : acc === "bb" ? -2 : 0;
  return { pc: (LETTER_PC[LETTERS.indexOf(letter)] + shift + 12) % 12, name: letter + acc, length: m[0].length };
}

/** Spell a tone from its root letter and degree, e.g. D# + (9 semitones, 7th degree) = C. */
function spell(rootName: string, rootPc: number, semi: number, degree: number): string {
  const li = (LETTERS.indexOf(rootName[0]) + degree) % 7;
  const pc = (rootPc + semi) % 12;
  const diff = ((pc - LETTER_PC[li] + 18) % 12) - 6;
  if (diff === 0) return LETTERS[li];
  if (diff === 1) return `${LETTERS[li]}#`;
  if (diff === -1) return `${LETTERS[li]}b`;
  if (diff === 2) return `${LETTERS[li]}##`;
  if (diff === -2) return `${LETTERS[li]}bb`;
  return pitchClassName(pc, false);
}

function normalise(input: string): string {
  return input
    .trim()
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/[°º]/g, "o")
    .replace(/Δ/g, "maj")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, "");
}

export function parseChordName(input: string): ParseResult {
  const text = normalise(input);
  if (!text) return { ok: false, error: "Type a chord name, e.g. A, Amaj7, D#o7, E7#5 or B7/D#." };
  const rootNote = parseNoteName(text);
  if (!rootNote || rootNote.name.length > 2) return { ok: false, error: "Start with a note name A–G, e.g. A or Bb." };

  let rest = text.slice(rootNote.length).replace(/6\/9/g, "69");
  // Slash bass: the last "/X" where X is a note name.
  let bass: { pc: number; name: string } | null = null;
  const slash = /\/([A-Ga-g](?:#|b)?)$/.exec(rest);
  if (slash) {
    const b = parseNoteName(slash[1])!;
    bass = { pc: b.pc, name: b.name };
    rest = rest.slice(0, slash.index);
  }

  // Chord state, built up token by token.
  let third: number | null = 4; // 4 major, 3 minor, null for sus / power chord
  let fifth: number | null = 7;
  let fifthAltered = false;
  let seventh: number | null = null;
  let dim = false;
  let sixth = false;
  const extensions = new Map<number, { semi: number; degree: number; label: string; required: boolean }>();
  const addExt = (semi: number, degree: number, label: string, required = true) =>
    extensions.set(degree * 100 + semi, { semi, degree, label, required });
  const sus: number[] = [];

  const applyNumber = (n: number, major7: boolean) => {
    if (n === 6) {
      sixth = true;
      return;
    }
    if (n === 5) {
      third = null;
      return;
    }
    if (seventh === null) seventh = major7 ? 11 : dim ? 9 : 10;
    if (n >= 9) addExt(2, 1, "9", n === 9);
    // A 13 chord skips the 11 (it clashes with a major 3rd); a minor 13 may keep it.
    if (n === 11 || (n === 13 && third === 3)) addExt(5, 3, "11", n === 11);
    if (n === 13) addExt(9, 5, "13", true);
  };

  let s = rest;
  let first = true;
  while (s.length) {
    let m: RegExpExecArray | null;
    if ((m = /^[(),]+/.exec(s))) {
      // separators
    } else if ((m = /^(m|min|mi|-)(maj|Maj|MAJ|M|ma(?=\d))(7|9|11|13)?/.exec(s))) {
      third = 3;
      applyNumber(Number(m[3] ?? 7), true);
    } else if ((m = /^(maj|Maj|MAJ|ma(?=\d)|M)(7|9|11|13)?/.exec(s))) {
      if (m[2]) applyNumber(Number(m[2]), true);
      // "Maj" on its own just means a major triad.
    } else if ((m = /^(min|mi|m)(?!aj)/.exec(s)) || (first && (m = /^-(?=$|\d|\(|maj|M|add|sus|\/)/.exec(s)))) {
      third = 3;
    } else if ((m = /^(dim|o)/.exec(s))) {
      third = 3;
      fifth = 6;
      fifthAltered = true;
      dim = true;
    } else if ((m = /^ø7?/.exec(s))) {
      third = 3;
      fifth = 6;
      fifthAltered = true;
      seventh = 10;
    } else if ((m = /^(aug|\+(?!5|9|11|13))/.exec(s))) {
      fifth = 8;
      fifthAltered = true;
    } else if ((m = /^69/.exec(s))) {
      sixth = true;
      addExt(2, 1, "9");
    } else if ((m = /^sus(2|4)?/.exec(s))) {
      third = null;
      sus.push(m[1] === "2" ? 2 : 5);
    } else if ((m = /^add(2|4|9|11|13)/.exec(s))) {
      const n = Number(m[1]);
      if (n === 2 || n === 9) addExt(2, 1, n === 2 ? "2" : "9");
      if (n === 4 || n === 11) addExt(5, 3, n === 4 ? "4" : "11");
      if (n === 13) addExt(9, 5, "13");
    } else if ((m = /^(b|#|\+|-)(5|9|11|13)/.exec(s))) {
      const up = m[1] === "#" || m[1] === "+";
      const n = Number(m[2]);
      if (n === 5) {
        fifth = up ? 8 : 6;
        fifthAltered = true;
      } else if (n === 9) addExt(up ? 3 : 1, 1, up ? "#9" : "b9");
      else if (n === 11) addExt(up ? 6 : 4, 3, up ? "#11" : "b11");
      else addExt(up ? 10 : 8, 5, up ? "#13" : "b13");
      // An altered 9 replaces a plain 9 implied by a 9/11/13 chord.
      if (n === 9) extensions.delete(100 + 2);
    } else if ((m = /^(13|11|9|7|6|5)/.exec(s))) {
      applyNumber(Number(m[1]), false);
    } else if ((m = /^(no|omit)(3|5)/.exec(s))) {
      if (m[2] === "3") third = null;
      else fifth = null;
    } else {
      return { ok: false, error: `Don't understand "${s}" in "${input.trim()}".` };
    }
    s = s.slice(m[0].length);
    first = false;
  }

  // A power chord is root + 5th only.
  const power = third === null && sus.length === 0 && seventh === null && !sixth && extensions.size === 0;

  const tones: ChordTone[] = [{ semi: 0, degree: 0, label: "1", required: true }];
  if (third !== null) tones.push({ semi: third, degree: 2, label: third === 3 ? "b3" : "3", required: true });
  for (const sx of sus) tones.push({ semi: sx, degree: sx === 2 ? 1 : 3, label: sx === 2 ? "2" : "4", required: true });
  const bigChord = 1 + (third !== null ? 1 : 0) + sus.length + (seventh !== null ? 1 : 0) + (sixth ? 1 : 0) + extensions.size >= 3;
  if (fifth !== null) {
    tones.push({
      semi: fifth,
      degree: 4,
      label: fifth === 7 ? "5" : fifth === 6 ? "b5" : "#5",
      // A plain 5th can be dropped from fuller chords; an altered one defines the chord.
      required: fifthAltered || !bigChord || power,
    });
  }
  if (sixth) tones.push({ semi: 9, degree: 5, label: "6", required: true });
  if (seventh !== null) tones.push({ semi: seventh, degree: 6, label: seventh === 11 ? "7" : seventh === 9 ? "bb7" : "b7", required: true });
  for (const e of extensions.values()) tones.push(e);

  // Drop duplicate pitch classes (keep the first, required wins).
  const byPc = new Map<number, ChordTone>();
  for (const t of tones) {
    const prev = byPc.get(t.semi);
    if (!prev) byPc.set(t.semi, t);
    else if (t.required) prev.required = true;
  }
  const unique = [...byPc.values()];

  const noteNames = unique.map((t) => spell(rootNote.name, rootNote.pc, t.semi, t.degree));
  const bassInChord = bass ? unique.some((t) => (rootNote.pc + t.semi) % 12 === bass!.pc) : true;
  if (bass && !bassInChord) noteNames.push(bass.name);

  return {
    ok: true,
    chord: {
      input: input.trim(),
      root: rootNote.pc,
      rootName: rootNote.name,
      bass: bass?.pc ?? null,
      bassName: bass?.name ?? null,
      tones: unique,
      noteNames,
    },
  };
}

/** What a grip of this chord must and may contain. */
export function chordQuery(chord: ParsedChord): VoicingQuery {
  const required = new Set<number>();
  const optional = new Set<number>();
  for (const t of chord.tones) (t.required ? required : optional).add((chord.root + t.semi) % 12);
  if (chord.bass !== null) {
    required.add(chord.bass);
    optional.delete(chord.bass);
  }
  // Guitars have six strings; if too many tones are required, let the 5th go first.
  return { required, optional, bass: chord.bass ?? chord.root };
}

/**
 * Spelling per pitch class (index 0–11) for this chord, e.g. E7#5 → B# rather than C.
 * Double sharps/flats fall back to the plain spelling, which the staff can draw.
 */
export function chordPcNames(chord: ParsedChord): string[] {
  const names = Array.from({ length: 12 }, (_, pc) => pitchClassName(pc, /b/.test(chord.rootName)));
  chord.tones.forEach((t, i) => {
    const name = chord.noteNames[i];
    if (!/##|bb/.test(name)) names[(chord.root + t.semi) % 12] = name;
  });
  if (chord.bass !== null && chord.bassName) names[chord.bass] = chord.bassName;
  return names;
}

/**
 * The chord written out in close position for the staff: the bass note (slash bass or root)
 * between C3 and B3, the other chord tones stacked above it, and 9ths, 11ths and 13ths an
 * octave up. Six notes at most (optional tones are dropped first).
 */
export function chordToPitches(chord: ParsedChord): { midi: number; name: string }[] {
  const names = chordPcNames(chord);
  const bassPc = chord.bass ?? chord.root;
  const bassMidi = 48 + bassPc; // C3…B3
  let tones = chord.tones.map((t) => ({
    t,
    // Distance above the root, with compound intervals (9, 11, 13) kept an octave up.
    above: t.semi + (/^[b#]?(9|11|13)$/.test(t.label) ? 12 : 0),
  }));
  const extraBass = chord.bass !== null && !chord.tones.some((t) => (chord.root + t.semi) % 12 === chord.bass);
  while (tones.length + (extraBass ? 1 : 0) > 6) {
    const i = tones.findIndex((x) => !x.t.required);
    if (i < 0) break;
    tones = tones.filter((_, j) => j !== i);
  }
  // Each tone at its first pitch above the bass; 9ths, 11ths and 13ths an octave higher.
  const out = new Map<number, string>();
  out.set(bassMidi, names[bassPc]);
  for (const { t, above } of tones) {
    const pc = (chord.root + t.semi) % 12;
    const extension = above >= 12;
    if (pc === bassPc && !extension) continue; // already the bass
    const midi = bassMidi + ((pc - bassPc + 12) % 12) + (extension ? 12 : 0);
    out.set(midi, names[pc]);
  }
  return [...out.entries()].sort((a, b) => a[0] - b[0]).map(([midi, name]) => ({ midi, name }));
}
