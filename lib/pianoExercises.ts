/**
 * Piano exercises adapted for guitar.
 *
 * I–IV–V with the least movement: play the three major triads of a key as close-position
 * triads on three adjacent strings (by default strings 4-3-2: D, G, B), and move between them
 * the way a pianist does: keep the common tone, move the other notes by a half or whole step.
 */
import { type Fingering, STANDARD_TUNING, formatFingering } from "./music.ts";
import { scalePcNames } from "./barryHarris.ts";

export const STRING_SET_432 = [2, 3, 4]; // D, G, B
const STRING_NUMBER = (s: number) => 6 - s; // index 0 (low E) is string 6

export type Degree = "I" | "IV" | "V";

/** Semitones above the key's root for each chord's root. */
const DEGREE_ROOT: Record<Degree, number> = { I: 0, IV: 5, V: 7 };

export interface TriadGrip {
  degree: Degree;
  frets: Fingering;
  /** Sounding pitches on the three strings, low → high. */
  midis: number[];
  /** Chord name with its bass, e.g. "F/C". */
  name: string;
  /** "root position", "1st inversion" or "2nd inversion". */
  inversion: string;
  /** Spelled notes, low → high. */
  notes: string[];
}

export interface VoiceMove {
  string: number; // guitar string number (1 = high e)
  from: string;
  to: string;
  /** Frets moved: + up the neck, − down. */
  frets: number;
}

export interface ProgressionStep {
  grip: TriadGrip;
  /** How each string moved from the previous grip (empty for the first). */
  moves: VoiceMove[];
}

const INVERSIONS = ["root position", "1st inversion", "2nd inversion"];

/** Every close-position major triad for this degree on the string set, up to maxFret. */
export function triadGrips(key: string, degree: Degree, strings = STRING_SET_432, maxFret = 15): TriadGrip[] {
  const names = scalePcNames(key, "major6");
  const keyPc = names.indexOf(key) >= 0 ? names.indexOf(key) : 0;
  const root = (keyPc + DEGREE_ROOT[degree]) % 12;
  const tones = [root, (root + 4) % 12, (root + 7) % 12];
  const out: TriadGrip[] = [];
  const perms = [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ]; // root position, 1st, 2nd inversion (bottom → top)
  perms.forEach((perm, inv) => {
    for (let base = 0; base <= maxFret; base++) {
      const opens = strings.map((s) => STANDARD_TUNING[s]);
      // Lowest note at fret `base` on the lowest string, the others stacked closely above it.
      const lowPc = tones[perm[0]];
      if ((opens[0] + base) % 12 !== lowPc) continue;
      const midis = [opens[0] + base];
      for (let k = 1; k < 3; k++) {
        let m = midis[k - 1] + 1;
        while (m % 12 !== tones[perm[k]]) m++;
        midis.push(m);
      }
      const frets: Fingering = [null, null, null, null, null, null];
      let ok = true;
      midis.forEach((m, k) => {
        const f = m - opens[k];
        if (f < 0 || f > maxFret) ok = false;
        frets[strings[k]] = f;
      });
      const fretted = frets.filter((f): f is number => f !== null && f > 0);
      if (!ok || (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3)) continue;
      const bass = names[midis[0] % 12];
      const rootName = names[root];
      out.push({
        degree,
        frets,
        midis,
        name: inv === 0 ? rootName : `${rootName}/${bass}`,
        inversion: INVERSIONS[inv],
        notes: midis.map((m) => names[m % 12]),
      });
    }
  });
  return out.sort((a, b) => a.midis[0] - b.midis[0]);
}

/** Total frets moved between two grips on the same strings. */
function distance(a: TriadGrip, b: TriadGrip, strings: number[]): number {
  return strings.reduce((sum, s) => sum + Math.abs((a.frets[s] as number) - (b.frets[s] as number)), 0);
}

/**
 * Walk a progression (e.g. I IV V I) from a starting grip of the I chord, choosing each next
 * grip as the one with the least total movement from the one before.
 */
export function progression(
  key: string,
  start: TriadGrip,
  order: Degree[] = ["I", "IV", "V", "I"],
  strings = STRING_SET_432,
): ProgressionStep[] {
  const steps: ProgressionStep[] = [{ grip: start, moves: [] }];
  let prev = start;
  for (const degree of order.slice(1)) {
    const options = triadGrips(key, degree, strings);
    const next = options.reduce((best, g) =>
      distance(prev, g, strings) < distance(prev, best, strings) ||
      (distance(prev, g, strings) === distance(prev, best, strings) && g.midis[0] < best.midis[0])
        ? g
        : best,
    );
    const moves = strings.map((s, k) => ({
      string: STRING_NUMBER(s),
      from: prev.notes[k],
      to: next.notes[k],
      frets: (next.frets[s] as number) - (prev.frets[s] as number),
    }));
    steps.push({ grip: next, moves });
    prev = next;
  }
  return steps;
}

/** The three starting points: the I chord in root position, 1st and 2nd inversion, lowest on the neck. */
export function startingGrips(key: string, strings = STRING_SET_432): TriadGrip[] {
  const all = triadGrips(key, "I", strings);
  return INVERSIONS.map((inv) => all.find((g) => g.inversion === inv)).filter((g): g is TriadGrip => !!g);
}

export function describe(steps: ProgressionStep[]): string {
  return steps.map((s) => `${s.grip.name}:${formatFingering(s.grip.frets)}`).join(" → ");
}
