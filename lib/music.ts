/**
 * Core guitar/music model. Pure functions only — no React, no DOM.
 *
 * String order everywhere is low E (index 0) → high E (index 5).
 * A string state is: null = muted (x), 0 = open, n >= 1 = fretted at n.
 */

export type StringState = number | null;
export type Fingering = StringState[]; // length 6
/** 1–4 = index…pinky, "T" = thumb (wrapped over the neck, usually on the low strings). */
export type Finger = number | "T";
export type Fingers = (Finger | null)[]; // null = no label

export const STRING_COUNT = 6;
export const MAX_FRET = 24;

/** MIDI note numbers for standard tuning E2 A2 D3 G3 B3 E4. */
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64] as const;
/** MIDI note of each open string, low (index 0) → high (5). */
export type Tuning = readonly number[];
export const STRING_NAMES = ["E", "A", "D", "G", "B", "e"] as const;
/** "low D", "A", … "high e" style labels for messages, from the tuning's open notes. */
function stringLabels(tuning: Tuning): string[] {
  const names = tuning.map((m) => pitchClassName(m % 12, [1, 3, 8, 10].includes(m % 12)));
  return names.map((n, i) => (i === 0 ? `low ${n}` : i === names.length - 1 ? `high ${n.toLowerCase()}` : n));
}

/** Fretboard inlay positions: single dots, and double dots at the octaves. */
export const SINGLE_INLAYS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
export const DOUBLE_INLAYS = new Set([12, 24]);

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Roots conventionally spelled with flats. */
const PREFER_FLAT_ROOT = new Set([1, 3, 8, 10]); // Db, Eb, Ab, Bb (F# stays sharp)

export function prefersFlats(rootPc: number | null): boolean {
  return rootPc !== null && PREFER_FLAT_ROOT.has(((rootPc % 12) + 12) % 12);
}

export function pitchClassName(pc: number, preferFlats = false): string {
  const i = ((pc % 12) + 12) % 12;
  return preferFlats ? FLAT_NAMES[i] : SHARP_NAMES[i];
}

export function midiAt(stringIndex: number, fret: number, tuning: Tuning = STANDARD_TUNING): number {
  return tuning[stringIndex] + fret;
}

export function emptyFingering(): Fingering {
  return [null, null, null, null, null, null];
}

export function emptyFingers(): Fingers {
  return [null, null, null, null, null, null];
}

/** Notes that actually sound, low → high, with their string index. */
export function soundingNotes(
  frets: Fingering,
  tuning: Tuning = STANDARD_TUNING,
): { string: number; fret: number; midi: number }[] {
  const out: { string: number; fret: number; midi: number }[] = [];
  frets.forEach((f, s) => {
    if (f !== null) out.push({ string: s, fret: f, midi: midiAt(s, f, tuning) });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Text form: "x32010", "x-3-2-0-1-0", "x 10 12 12 11 10"
// ---------------------------------------------------------------------------

export function parseFingering(input: string): Fingering | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  const tokens = /[\s,\-/|.]/.test(text)
    ? text.split(/[\s,\-/|.]+/).filter(Boolean)
    : text.split("");
  if (tokens.length !== STRING_COUNT) return null;
  const result: Fingering = [];
  for (const t of tokens) {
    if (t === "x" || t === "m") {
      result.push(null);
      continue;
    }
    if (!/^\d{1,2}$/.test(t)) return null;
    const n = Number(t);
    if (n > MAX_FRET) return null;
    result.push(n);
  }
  return result;
}

export function formatFingering(frets: Fingering): string {
  const anyTwoDigit = frets.some((f) => f !== null && f >= 10);
  const parts = frets.map((f) => (f === null ? "x" : String(f)));
  return anyTwoDigit ? parts.join("-") : parts.join("");
}

// ---------------------------------------------------------------------------
// Chord identification
// ---------------------------------------------------------------------------

interface Template {
  suffix: string;
  intervals: number[];
  /** Lower = more common/simpler; used to break ties. */
  rank: number;
}

const TEMPLATES: Template[] = [
  { suffix: "", intervals: [0, 4, 7], rank: 0 },
  { suffix: "m", intervals: [0, 3, 7], rank: 0 },
  { suffix: "5", intervals: [0, 7], rank: 1 },
  { suffix: "7", intervals: [0, 4, 7, 10], rank: 1 },
  { suffix: "maj7", intervals: [0, 4, 7, 11], rank: 1 },
  { suffix: "m7", intervals: [0, 3, 7, 10], rank: 1 },
  { suffix: "sus4", intervals: [0, 5, 7], rank: 2 },
  { suffix: "sus2", intervals: [0, 2, 7], rank: 2 },
  { suffix: "dim", intervals: [0, 3, 6], rank: 2 },
  { suffix: "aug", intervals: [0, 4, 8], rank: 2 },
  { suffix: "6", intervals: [0, 4, 7, 9], rank: 2 },
  { suffix: "m6", intervals: [0, 3, 7, 9], rank: 2 },
  { suffix: "add9", intervals: [0, 2, 4, 7], rank: 2 },
  { suffix: "madd9", intervals: [0, 2, 3, 7], rank: 2 },
  { suffix: "7sus4", intervals: [0, 5, 7, 10], rank: 3 },
  { suffix: "m7b5", intervals: [0, 3, 6, 10], rank: 3 },
  { suffix: "dim7", intervals: [0, 3, 6, 9], rank: 3 },
  { suffix: "mMaj7", intervals: [0, 3, 7, 11], rank: 3 },
  { suffix: "7#5", intervals: [0, 4, 8, 10], rank: 3 },
  { suffix: "9", intervals: [0, 2, 4, 7, 10], rank: 3 },
  { suffix: "maj9", intervals: [0, 2, 4, 7, 11], rank: 3 },
  { suffix: "m9", intervals: [0, 2, 3, 7, 10], rank: 3 },
  { suffix: "6/9", intervals: [0, 2, 4, 7, 9], rank: 3 },
  { suffix: "7b9", intervals: [0, 1, 4, 7, 10], rank: 4 },
  { suffix: "7#9", intervals: [0, 3, 4, 7, 10], rank: 4 },
  { suffix: "add11", intervals: [0, 4, 5, 7], rank: 4 },
  { suffix: "maj7#11", intervals: [0, 4, 6, 7, 11], rank: 4 },
  { suffix: "11", intervals: [0, 2, 5, 7, 10], rank: 4 },
  { suffix: "m11", intervals: [0, 2, 3, 5, 7, 10], rank: 4 },
  { suffix: "13", intervals: [0, 2, 4, 7, 9, 10], rank: 4 },
  { suffix: "7/6", intervals: [0, 4, 7, 9, 10], rank: 5 },
];

export interface ChordMatch {
  name: string;
  root: number; // pitch class
  bass: number; // pitch class
  suffix: string;
  omitsFifth: boolean;
  score: number;
}

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

/** All plausible names for the sounding notes, best first. */
export function identifyChord(frets: Fingering, tuning: Tuning = STANDARD_TUNING): ChordMatch[] {
  return identifyPitches(soundingNotes(frets, tuning).map((n) => n.midi));
}

/** All plausible names for a set of MIDI pitches (any order), best first. */
export function identifyPitches(midis: number[]): ChordMatch[] {
  if (midis.length < 2) return [];
  const sorted = [...midis].sort((a, b) => a - b);
  const pcs = [...new Set(sorted.map((m) => m % 12))];
  const bass = sorted[0] % 12;
  if (pcs.length < 2) return [];

  const matches: ChordMatch[] = [];
  for (const root of pcs) {
    const rel = pcs.map((pc) => (pc - root + 12) % 12).sort((a, b) => a - b);
    for (const t of TEMPLATES) {
      let omitsFifth = false;
      if (!sameSet(rel, t.intervals)) {
        // Allow a missing perfect fifth on chords with 4+ notes (common voicings).
        const no5 = t.intervals.filter((i) => i !== 7);
        if (t.intervals.length >= 4 && no5.length !== t.intervals.length && sameSet(rel, no5)) {
          omitsFifth = true;
        } else continue;
      }
      let score = 100 - t.rank * 10;
      if (root === bass) score += 25;
      if (omitsFifth) score -= 8;
      const flats = PREFER_FLAT_ROOT.has(root);
      const rootName = pitchClassName(root, flats);
      const bassName = pitchClassName(bass, flats);
      const name = root === bass ? `${rootName}${t.suffix}` : `${rootName}${t.suffix}/${bassName}`;
      matches.push({ name, root, bass, suffix: t.suffix, omitsFifth, score });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  // De-duplicate by name.
  const seen = new Set<string>();
  return matches.filter((m) => (seen.has(m.name) ? false : (seen.add(m.name), true)));
}

const INTERVAL_NAMES = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "#5", "6", "b7", "7"];

export function intervalName(pc: number, root: number): string {
  return INTERVAL_NAMES[(pc - root + 12) % 12];
}

// ---------------------------------------------------------------------------
// Shape analysis: barre, finger suggestions, playability
// ---------------------------------------------------------------------------

export interface Barre {
  fret: number;
  fromString: number; // lower index (bass side)
  toString: number; // higher index (treble side)
}

/**
 * Detect a first-finger barre: the lowest fretted fret, held on 2+ strings,
 * where every string between the outermost ones is fretted at or above it.
 */
export function detectBarre(frets: Fingering): Barre | null {
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  if (fretted.length < 2) return null;
  const low = Math.min(...fretted);
  const idx = frets.map((f, i) => (f === low ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) return null;
  const from = idx[0];
  const to = idx[idx.length - 1];
  for (let s = from; s <= to; s++) {
    const f = frets[s];
    if (f === null || f < low) return null;
  }
  // Barring two adjacent strings only to play them both isn't usually drawn as a barre
  // unless other strings are fretted higher (i.e. it's acting as a capo).
  if (to - from === 1 && fretted.length === 2) return null;
  return { fret: low, fromString: from, toString: to };
}

export interface FingerPlan {
  fingers: Fingers;
  /** The first-finger barre the plan uses (null if none). */
  barre: Barre | null;
  /** Strings fretted by the thumb: [], one string, or adjacent strings for a thumb barre. */
  thumbStrings: number[];
  /**
   * "over": rock/jazz grip, thumb wrapped over the top of the neck onto the low E (and A).
   * "front": thumb position, as on cello/violin: the thumb sits in front of the neck behind
   * the fingers, stopping any string(s) at the lowest fret, fingers free above it.
   */
  thumbStyle: "over" | "front" | null;
  /** True when even this plan needs more than four fingers (plus thumb). */
  overflow: boolean;
}

type Note = { f: number; s: number };

/** Assign fingers given a barre and any strings already taken by the thumb. */
/**
 * How far above the thumb (in frets) the hand can reach when the thumb anchors the low E.
 * From fret 3 up the frets are narrow enough for a thumb-to-pinky stretch of 7 frets
 * (e.g. 3-x-x-0-0-10); nearer the nut they're too wide, so the hand keeps its normal span.
 */
export function thumbReach(thumbFret: number): number {
  return thumbFret >= 3 ? 7 : 4;
}

/**
 * @param anchorTop  count fingers down from the highest note (pinky on top) — used when
 *                   the thumb sits far behind the hand and the fingers stretch upward.
 */
function planWith(frets: Fingering, barre: Barre | null, thumbStrings: number[], anchorTop = false): FingerPlan {
  const fingers = emptyFingers();
  for (const s of thumbStrings) fingers[s] = "T";
  const thumbStyle = thumbStrings.length ? "over" : null;
  const fretted = frets
    .map((f, s) => ({ f, s }))
    .filter((n): n is Note => n.f !== null && n.f > 0 && fingers[n.s] === null);
  if (fretted.length === 0) return { fingers, barre: null, thumbStrings, thumbStyle, overflow: false };

  let next = 1;
  let base = Math.min(...fretted.map((n) => n.f));
  if (barre) {
    for (let s = barre.fromString; s <= barre.toString; s++) {
      if (frets[s] === barre.fret && fingers[s] === null) fingers[s] = 1;
    }
    next = 2;
    base = barre.fret;
  }
  if (anchorTop && !barre) {
    // Frame the four fingers so the pinky lands on the highest note.
    base = Math.max(...fretted.map((n) => n.f)) - 3;
  }
  const rest = fretted.filter((n) => fingers[n.s] === null).sort((a, b) => a.f - b.f || a.s - b.s);

  const assign = (groups: Note[][]) => {
    const out = [...fingers];
    let nxt = next;
    let overflow = false;
    for (const g of groups) {
      const want = Math.max(nxt, g[0].f - base + 1);
      if (want > 4) overflow = true;
      const finger = Math.min(4, want);
      for (const n of g) out[n.s] = finger;
      nxt = finger + 1;
    }
    return { out, overflow };
  };

  // One finger per note first; if that runs past the pinky, let one finger
  // cover adjacent strings on the same fret (a partial barre, e.g. A-shape 1-3-3-3-1).
  const single = assign(rest.map((n) => [n]));
  if (!single.overflow) return { fingers: single.out, barre, thumbStrings, thumbStyle, overflow: false };
  const groups: Note[][] = [];
  for (const n of rest) {
    const last = groups[groups.length - 1];
    const tail = last?.[last.length - 1];
    const between = tail ? frets.slice(tail.s + 1, n.s) : [];
    if (tail && tail.f === n.f && between.every((f) => f !== null && f >= n.f)) last.push(n);
    else groups.push([n]);
  }
  const grouped = assign(groups);
  return { fingers: grouped.out, barre, thumbStrings, thumbStyle, overflow: grouped.overflow };
}

/**
 * Best-guess fingering. The thumb is only used when four fingers aren't enough, in one of
 * two ways (tried in this order):
 *
 * 1. Over the neck (rock/jazz): the thumb wraps over the top of the neck to fret the low E,
 *    or the low E and A together, level with the index finger.
 * 2. Thumb position (cello/violin): the thumb sits in front of the neck as a movable nut,
 *    stopping any string, or a run of adjacent strings, at the lowest fret in the shape,
 *    with the fingers free above it. It can reach thumbReach() frets.
 */
export function planFingering(frets: Fingering): FingerPlan {
  const plain = planWith(frets, detectBarre(frets), []);
  if (!plain.overflow) return plain;

  const tryThumb = (thumb: number[], style: "over" | "front"): FingerPlan | null => {
    const t = frets[thumb[0]] as number;
    const rest: Fingering = frets.map((f, s) => (thumb.includes(s) ? null : f));
    const others = rest.filter((f): f is number => f !== null && f > 0);
    if (others.length === 0) return null;
    const lo = Math.min(...others);
    const hi = Math.max(...others);
    if (style === "over") {
      // Wrapped over the neck, the thumb stays level with the index finger.
      if (t < lo - 2 || t > lo + 1) return null;
    } else {
      // In front of the neck the thumb is behind every finger, within reach of the highest.
      // It's an up-the-neck technique: near the nut the frets are too wide for it.
      if (t < 3 || lo <= t || hi - t > thumbReach(t)) return null;
    }
    // Thumb well behind the hand: the fingers stretch up, pinky on the highest note.
    const plan = planWith(frets, detectBarre(rest), thumb, lo - t > 2);
    return plan.overflow ? null : { ...plan, thumbStyle: style };
  };

  // 1. Over the neck: low E, or low E + A on the same fret.
  const f0 = frets[0];
  if (f0 !== null && f0 > 0) {
    for (const thumb of frets[1] === f0 ? [[0, 1], [0]] : [[0]]) {
      const plan = tryThumb(thumb, "over");
      if (plan) return plan;
    }
  }

  // 2. Thumb position: the thumb on the lowest fret, on a run of adjacent strings
  //    (a thumb barre) or a single string, lower-pitched strings first.
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const t = Math.min(...fretted);
  const atT = frets.map((f, s) => (f === t ? s : -1)).filter((s) => s >= 0);
  const candidates: number[][] = [];
  for (let i = 0; i < atT.length; i++) {
    let j = i;
    while (j + 1 < atT.length && atT[j + 1] === atT[j] + 1) j++;
    if (j > i) candidates.push(atT.slice(i, j + 1));
    i = j;
  }
  for (const s of atT) candidates.push([s]);
  for (const thumb of candidates) {
    const plan = tryThumb(thumb, "front");
    if (plan) return plan;
  }
  return plain;
}

/** Heuristic finger assignment for a given barre (no thumb). Prefer planFingering(). */
export function suggestFingers(frets: Fingering, barre: Barre | null): Fingers {
  return planWith(frets, barre, []).fingers;
}

export interface Warning {
  level: "info" | "warn";
  message: string;
}

export function playabilityWarnings(
  frets: Fingering,
  plan: FingerPlan = planFingering(frets),
  tuning: Tuning = STANDARD_TUNING,
): Warning[] {
  const labels = stringLabels(tuning);
  const warnings: Warning[] = [];
  const sounding = frets.filter((f) => f !== null);
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  if (sounding.length === 0) {
    warnings.push({ level: "info", message: "No strings are sounding yet." });
    return warnings;
  }
  // The thumb wraps round the neck, so it isn't part of the fingers' span.
  const fingered = frets.filter(
    (f, s): f is number => f !== null && f > 0 && !plan.thumbStrings.includes(s),
  );
  if (fingered.length > 0) {
    const span = Math.max(...fingered) - Math.min(...fingered) + 1;
    if (span > 5) {
      warnings.push({ level: "warn", message: `Spans ${span} frets — likely unplayable for most hands.` });
    } else if (span === 5) {
      warnings.push({ level: "info", message: "Spans 5 frets — a big stretch." });
    }
  }
  if (plan.overflow) {
    const barre = detectBarre(frets);
    const barreCovered = barre
      ? frets.filter((f, s) => s >= barre.fromString && s <= barre.toString && f === barre.fret).length
      : 0;
    const fingersNeeded = fretted.length - barreCovered + (barre ? 1 : 0);
    // When the hand has enough fingers, the problem is the reach — already covered by the span warning.
    if (fingersNeeded > 4) warnings.push({
      level: "warn",
      message: `Needs ${fingersNeeded} fretting fingers${barre ? "" : " (no barre possible)"} — more than a hand has, even with the thumb.`,
    });
  } else if (plan.thumbStrings.length > 0) {
    const t = frets[plan.thumbStrings[0]] as number;
    const names = plan.thumbStrings.map((s) => labels[s]);
    const strings = names.length === 1 ? `the ${names[0]} string` : `the ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} strings`;
    const reach = fingered.length ? Math.max(...fingered) - t : 0;
    const stretch = reach >= 5 ? `, reaching ${reach} frets up to the highest note — a big stretch` : "";
    const message =
      plan.thumbStyle === "front"
        ? `Thumb position (as on cello): the thumb stops ${strings} at fret ${t} from the front of the neck, fingers free above${stretch}.`
        : plan.thumbStrings.length === 2
          ? `Thumb barres the ${labels[0]} and ${labels[1]} strings${stretch}.`
          : `Uses the thumb on the ${labels[0]} string${stretch}.`;
    warnings.push({ level: "info", message });
  }
  if (sounding.length < 3) {
    warnings.push({ level: "info", message: "Fewer than 3 strings sounding — this is a dyad, not a full chord." });
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Fret window: which frets to draw so nothing is ever cut off
// ---------------------------------------------------------------------------

export interface FretWindow {
  /** First fret row drawn (1 means the nut is shown). */
  start: number;
  /** Number of fret rows drawn. */
  count: number;
}

/**
 * Choose the visible fret range. `minRows` is the smallest box size; the box grows
 * as needed so every fretted note fits — the reason this tool exists.
 */
export function fretWindow(frets: Fingering, minRows = 4): FretWindow {
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  if (fretted.length === 0) return { start: 1, count: minRows };
  const lo = Math.min(...fretted);
  const hi = Math.max(...fretted);
  // Fits at the nut (allowing one extra row rather than losing the nut).
  if (hi <= minRows) return { start: 1, count: minRows };
  if (hi <= minRows + 1) return { start: 1, count: hi };
  return { start: lo, count: Math.max(minRows, hi - lo + 1) };
}
