/**
 * Notation → guitar: parse written notes, and search the neck for playable grips.
 */
import {
  type Fingering,
  MAX_FRET,
  STANDARD_TUNING,
  type Tuning,
  STRING_COUNT,
  formatFingering,
  planFingering,
  playabilityWarnings,
} from "./music.ts";
import { type Accidental, type StaffNote, noteLabel, spelledNote } from "./staff.ts";

export const MIN_MIDI = STANDARD_TUNING[0]; // E2 (standard tuning)
export const MAX_MIDI = STANDARD_TUNING[STRING_COUNT - 1] + MAX_FRET; // E6 (standard tuning)

/** Lowest open string to the highest string's top fret, for a tuning. */
export function guitarRange(tuning: Tuning = STANDARD_TUNING): { min: number; max: number } {
  return { min: Math.min(...tuning), max: Math.max(...tuning) + MAX_FRET };
}

/** Parse "C3 E3 G3", "Bb2, F3", "c#4" etc. Returns null if any token is invalid. */
export function parseNotes(input: string): StaffNote[] | null {
  const tokens = input.split(/[\s,;]+/).filter(Boolean);
  const out: StaffNote[] = [];
  for (const t of tokens) {
    const m = /^([A-Ga-g])(#|b|♯|♭)?(\d)$/.exec(t);
    if (!m) return null;
    const acc: Accidental = m[2] === "#" || m[2] === "♯" ? "#" : m[2] === "b" || m[2] === "♭" ? "b" : "";
    out.push(spelledNote(m[1].toUpperCase(), acc, Number(m[3])));
  }
  return out;
}

export function formatNotes(notes: StaffNote[]): string {
  return sortNotes(notes).map(noteLabel).join(" ");
}

export function sortNotes(notes: StaffNote[]): StaffNote[] {
  return [...notes].sort((a, b) => a.midi - b.midi || a.step - b.step);
}

export function inGuitarRange(nt: StaffNote, tuning: Tuning = STANDARD_TUNING): boolean {
  const { min, max } = guitarRange(tuning);
  return nt.midi >= min && nt.midi <= max;
}

// ---------------------------------------------------------------------------
// Voicing search
// ---------------------------------------------------------------------------

export interface Voicing {
  frets: Fingering;
  /** True when it plays exactly the written pitches (same octaves). */
  exact: boolean;
  score: number;
}

const SEARCH_MAX_FRET = 20;
const MAX_SPAN = 4; // highest fretted minus lowest fretted

function isPlayable(frets: Fingering): boolean {
  const plan = planFingering(frets);
  // A thumb on the low E wraps round the neck, so it doesn't count towards the fingers' span.
  const fretted = frets.filter((f, s): f is number => f !== null && f > 0 && !plan.thumbStrings.includes(s));
  if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > MAX_SPAN) return false;
  return !playabilityWarnings(frets, plan).some((w) => w.level === "warn");
}

function interiorMutes(frets: Fingering): number {
  const sounding = frets.map((f, i) => (f !== null ? i : -1)).filter((i) => i >= 0);
  if (sounding.length < 2) return 0;
  let n = 0;
  for (let s = sounding[0]; s <= sounding[sounding.length - 1]; s++) if (frets[s] === null) n++;
  return n;
}

/** Higher is better: compact, low on the neck, few awkward muted strings. */
export function scoreVoicing(frets: Fingering): number {
  const sounding = frets.filter((f) => f !== null).length;
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const opens = frets.filter((f) => f === 0).length;
  const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
  const low = fretted.length ? Math.min(...fretted) : 0;
  const plan = planFingering(frets);
  const barre = plan.barre;
  const fingers =
    fretted.length - plan.thumbStrings.length - (barre ? fretted.filter((f) => f === barre.fret).length - 1 : 0);
  // The thumb works, but a grip without it is easier.
  const thumbCost = plan.thumbStrings.length ? 1.5 : 0;
  const high = fretted.length ? Math.max(...fretted) : 0;
  // Open strings help in first position; mixed with notes far up the neck they're awkward.
  const openScore = high <= 4 ? opens * 0.6 : -opens * 0.9;
  return sounding * 2 - interiorMutes(frets) * 4 - span * 1.5 - low * 0.3 + openScore - fingers * 0.5 - thumbCost;
}

/** Grips that play exactly the given pitches, one note per string. */
export function exactVoicings(midis: number[], limit = 8, tuning: Tuning = STANDARD_TUNING): Voicing[] {
  const notes = [...new Set(midis)].sort((a, b) => a - b);
  if (notes.length === 0 || notes.length > STRING_COUNT) return [];
  const results = new Map<string, Voicing>();
  const frets: Fingering = Array(STRING_COUNT).fill(null);

  const place = (i: number) => {
    if (i === notes.length) {
      if (isPlayable(frets)) {
        const key = formatFingering(frets);
        if (!results.has(key)) results.set(key, { frets: [...frets], exact: true, score: scoreVoicing(frets) });
      }
      return;
    }
    for (let s = 0; s < STRING_COUNT; s++) {
      if (frets[s] !== null) continue;
      const f = notes[i] - tuning[s];
      if (f < 0 || f > MAX_FRET) continue;
      frets[s] = f;
      place(i + 1);
      frets[s] = null;
    }
  };
  place(0);
  return [...results.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Other grips for the same chord: every pitch class covered, the written bass note
 * kept as the lowest sounding note (relaxed if nothing fits), any octaves.
 */
export function chordVoicings(
  midis: number[],
  limit = 12,
  exclude: Set<string> = new Set(),
  tuning: Tuning = STANDARD_TUNING,
): Voicing[] {
  if (midis.length === 0) return [];
  const sorted = [...midis].sort((a, b) => a - b);
  return searchVoicings(
    { required: new Set(sorted.map((m) => m % 12)), optional: new Set(), bass: sorted[0] % 12 },
    limit,
    exclude,
    tuning,
  ).voicings;
}

export interface VoicingQuery {
  /** Pitch classes every grip must contain. */
  required: Set<number>;
  /** Pitch classes a grip may contain but can leave out (e.g. the 5th of a 13 chord). */
  optional: Set<number>;
  /** Preferred lowest note (pitch class), or null for any. */
  bass: number | null;
}

/**
 * Search the neck for playable grips of a chord. Tries to keep `bass` lowest; if nothing
 * fits it relaxes that, and reports it with keptBass = false.
 */
export function searchVoicings(
  query: VoicingQuery,
  limit = 12,
  exclude: Set<string> = new Set(),
  tuning: Tuning = STANDARD_TUNING,
): { voicings: Voicing[]; keptBass: boolean } {
  const { required, optional, bass } = query;
  if (required.size === 0 || required.size > STRING_COUNT) return { voicings: [], keptBass: true };
  const allowed = new Set([...required, ...optional]);
  const minSounding = Math.max(3, required.size);

  const search = (keepBass: boolean) => {
    const results = new Map<string, Voicing>();
    for (let base = 1; base <= SEARCH_MAX_FRET - 3; base++) {
      const options: number[][] = tuning.map((open) => {
        const opts: number[] = [-1]; // -1 = muted
        // Any string can also be stopped by the thumb, up to 7 frets behind the hand
        // (over the neck on the low E, or in front of the neck in thumb position).
        const thumbFrets = Array.from({ length: 7 }, (_, i) => base - 7 + i).filter((f) => f >= 1);
        for (const f of [0, ...thumbFrets, base, base + 1, base + 2, base + 3]) {
          if (allowed.has((open + f) % 12) && !opts.includes(f)) opts.push(f);
        }
        return opts;
      });
      const frets: Fingering = Array(STRING_COUNT).fill(null);
      // At most one thumb fret below the hand's window: one string, or adjacent ones (a thumb barre).
      let thumbFret: number | null = null;
      let thumbLast = -1;
      const walk = (s: number) => {
        if (s === STRING_COUNT) {
          const present = frets
            .map((f, i) => (f === null ? null : (tuning[i] + f) % 12))
            .filter((pc): pc is number => pc !== null);
          if (present.length < minSounding) return;
          if (keepBass && bass !== null && present[0] !== bass) return;
          const have = new Set(present);
          for (const pc of required) if (!have.has(pc)) return;
          if (interiorMutes(frets) > 1) return;
          const key = formatFingering(frets);
          if (results.has(key) || exclude.has(key) || !isPlayable(frets)) return;
          results.set(key, { frets: [...frets], exact: false, score: scoreVoicing(frets) });
          return;
        }
        for (const f of options[s]) {
          const behind = f > 0 && f < base;
          if (behind && thumbFret !== null && (f !== thumbFret || thumbLast !== s - 1)) continue;
          const saved = [thumbFret, thumbLast] as const;
          if (behind) {
            thumbFret = f;
            thumbLast = s;
          }
          frets[s] = f < 0 ? null : f;
          walk(s + 1);
          [thumbFret, thumbLast] = saved;
        }
        frets[s] = null;
      };
      walk(0);
    }
    return [...results.values()].sort((a, b) => b.score - a.score);
  };

  let keptBass = true;
  let found = search(true);
  if (found.length === 0 && bass !== null) {
    found = search(false);
    keptBass = false;
  }
  // Keep variety across the neck: at most 3 grips starting in the same position.
  const perPosition = new Map<number, number>();
  const out: Voicing[] = [];
  for (const v of found) {
    const fretted = v.frets.filter((f): f is number => f !== null && f > 0);
    const pos = fretted.length ? Math.min(...fretted) : 0;
    const bucket = Math.floor(pos / 3);
    const n = perPosition.get(bucket) ?? 0;
    if (n >= 3) continue;
    perPosition.set(bucket, n + 1);
    out.push(v);
    if (out.length >= limit) break;
  }
  return { voicings: out, keptBass };
}
