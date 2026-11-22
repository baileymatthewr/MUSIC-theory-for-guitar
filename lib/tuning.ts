/**
 * Guitar tunings. A tuning is the MIDI note of each open string, low (index 0) → high (5).
 */
import { STANDARD_TUNING, STRING_COUNT, type Tuning } from "./music.ts";

export interface TuningPreset {
  id: string;
  name: string;
  /** Spelled notes with octaves, low → high. */
  notes: string[];
}

export const TUNING_PRESETS: TuningPreset[] = [
  { id: "standard", name: "Standard", notes: ["E2", "A2", "D3", "G3", "B3", "E4"] },
  { id: "half-down", name: "Half step down", notes: ["Eb2", "Ab2", "Db3", "Gb3", "Bb3", "Eb4"] },
  { id: "whole-down", name: "Whole step down", notes: ["D2", "G2", "C3", "F3", "A3", "D4"] },
  { id: "drop-d", name: "Drop D", notes: ["D2", "A2", "D3", "G3", "B3", "E4"] },
  { id: "double-drop-d", name: "Double drop D", notes: ["D2", "A2", "D3", "G3", "B3", "D4"] },
  { id: "drop-c", name: "Drop C", notes: ["C2", "G2", "C3", "F3", "A3", "D4"] },
  { id: "dadgad", name: "DADGAD", notes: ["D2", "A2", "D3", "G3", "A3", "D4"] },
  { id: "open-d", name: "Open D", notes: ["D2", "A2", "D3", "F#3", "A3", "D4"] },
  { id: "open-g", name: "Open G", notes: ["D2", "G2", "D3", "G3", "B3", "D4"] },
  { id: "open-e", name: "Open E", notes: ["E2", "B2", "E3", "G#3", "B3", "E4"] },
  { id: "open-a", name: "Open A", notes: ["E2", "A2", "E3", "A3", "C#4", "E4"] },
  { id: "open-c", name: "Open C", notes: ["C2", "G2", "C3", "G3", "C4", "E4"] },
];

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Spelling for a custom tuning: the names guitarists usually use for retuned strings. */
const CUSTOM_NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/** "Eb2" → 39. Returns null if it isn't a note with an octave. */
export function noteToMidi(note: string): number | null {
  const m = /^([A-Ga-g])(#|b|♯|♭)?(\d)$/.exec(note.trim());
  if (!m) return null;
  const shift = m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + LETTER_PC[m[1].toUpperCase()] + shift;
}

/** 39 → "Eb2" (custom spelling). */
export function midiToNote(midi: number): string {
  return `${CUSTOM_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export const STANDARD = STANDARD_TUNING as Tuning;

export function presetTuning(p: TuningPreset): Tuning {
  return p.notes.map((n) => noteToMidi(n)!);
}

export function sameTuning(a: Tuning, b: Tuning): boolean {
  return a.length === b.length && a.every((m, i) => m === b[i]);
}

export function isStandard(t: Tuning): boolean {
  return sameTuning(t, STANDARD);
}

export function findPreset(t: Tuning): TuningPreset | null {
  return TUNING_PRESETS.find((p) => sameTuning(presetTuning(p), t)) ?? null;
}

/** Spelled notes with octaves, low → high: the preset's own spelling when it matches one. */
export function tuningNotes(t: Tuning): string[] {
  return findPreset(t)?.notes ?? t.map(midiToNote);
}

/** Letter names only (no octave), for printing above the strings: "D A D G A D". */
export function tuningLetters(t: Tuning): string[] {
  return tuningNotes(t).map((n) => n.replace(/\d$/, ""));
}

/** A short name: the preset's name, or the notes. */
export function tuningName(t: Tuning): string {
  return findPreset(t)?.name ?? tuningLetters(t).join(" ");
}

/** Range offered for each string: a fifth below to a fourth above its standard note. */
export function stringRange(s: number): number[] {
  const base = STANDARD[s];
  return Array.from({ length: 13 }, (_, i) => base - 7 + i);
}

/** For the address bar: "D2-A2-D3-G3-A3-D4". */
export function formatTuningParam(t: Tuning): string {
  return tuningNotes(t).join("-");
}

export function parseTuningParam(s: string): Tuning | null {
  const parts = s.split(/[-\s,]+/).filter(Boolean);
  if (parts.length !== STRING_COUNT) return null;
  const midis = parts.map(noteToMidi);
  if (midis.some((m) => m === null)) return null;
  const t = midis as number[];
  // Keep within the range the picker offers.
  if (t.some((m, i) => !stringRange(i).includes(m))) return null;
  return t;
}
