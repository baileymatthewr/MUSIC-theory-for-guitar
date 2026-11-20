/**
 * Grand-staff rendering of the sounding notes, at concert pitch:
 * low E string (E2) sits on the ledger line below the bass staff,
 * the high e string's 19th fret (B5) sits above the treble staff's first ledger line.
 *
 * All glyphs (clefs, noteheads, accidentals) are drawn as plain SVG paths so the
 * exported image never depends on installed music fonts.
 */
import { type Fingering, midiAt, pitchClassName } from "./music.ts";

export interface StaffColors {
  ink: string;
  background: string | null;
  root: string;
}

export interface StaffOptions {
  preferFlats: boolean;
  root: number | null;
  highlightRoot: boolean;
  colors: StaffColors;
  /** Optional spelling per pitch class (index 0–11), e.g. from chordSpelling(). */
  pcNames?: string[];
  /** Draw these spelled notes instead of the notes derived from the frets. */
  notes?: StaffNote[];
}

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
export type Accidental = "" | "#" | "b";

/** Middle C (C4) and above go on the treble staff. */
export const MIDDLE_C_STEP = 28;

/** Build a note from an explicit spelling (letter + accidental + octave). */
export function spelledNote(letter: string, accidental: Accidental, octave: number): StaffNote {
  const idx = LETTER_INDEX[letter];
  const step = octave * 7 + idx;
  const midi = (octave + 1) * 12 + LETTER_PC[idx] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0);
  return { midi, letter, accidental, octave, step, staff: step >= MIDDLE_C_STEP ? "treble" : "bass" };
}

/** Note on a given diatonic step with an accidental. */
export function noteFromStep(step: number, accidental: Accidental): StaffNote {
  const octave = Math.floor(step / 7);
  return spelledNote(LETTERS[((step % 7) + 7) % 7], accidental, octave);
}

export function noteLabel(nt: StaffNote): string {
  return `${nt.letter}${nt.accidental}${nt.octave}`;
}

export interface StaffNote {
  midi: number;
  letter: string;
  accidental: "" | "#" | "b";
  octave: number;
  /** Diatonic step: octave * 7 + letter index (C4 = 28). */
  step: number;
  staff: "treble" | "bass";
}

/**
 * Spell every pitch class relative to a chord, so each chord tone gets the right letter:
 * C minor → E♭ (not D♯), E major → G♯ (not A♭). Pitch classes that can't be spelled
 * with a single sharp or flat fall back to the default spelling.
 */
export function chordSpelling(root: number, rootName: string, suffix: string, preferFlats: boolean): string[] {
  const rootLetter = LETTER_INDEX[rootName[0]];
  const names: string[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const interval = (pc - root + 12) % 12;
    let offset = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6][interval];
    if (interval === 3 && suffix.includes("#9")) offset = 1;
    if (interval === 6 && suffix.includes("#11")) offset = 3;
    if (interval === 8 && (suffix.includes("aug") || suffix.includes("#5"))) offset = 4;
    if (interval === 9 && suffix.includes("dim7")) offset = 5;
    const letterIdx = (rootLetter + offset) % 7;
    const diff = ((pc - LETTER_PC[letterIdx] + 18) % 12) - 6;
    names.push(
      diff === 0 ? LETTERS[letterIdx] : diff === 1 ? `${LETTERS[letterIdx]}#` : diff === -1 ? `${LETTERS[letterIdx]}b` : pitchClassName(pc, preferFlats),
    );
  }
  return names;
}

/** Spell a MIDI note and work out where it sits on the grand staff. */
export function spellNote(midi: number, preferFlats: boolean, pcNames?: string[]): StaffNote {
  const name = pcNames?.[midi % 12] ?? pitchClassName(midi % 12, preferFlats);
  const letter = name[0];
  const accidental = (name.slice(1) as "" | "#" | "b") || "";
  // B♯ belongs to the octave below its sounding C; C♭ to the octave above its sounding B.
  const octave = Math.floor(midi / 12) - 1 + (name === "Cb" ? 1 : name === "B#" ? -1 : 0);
  return {
    midi,
    letter,
    accidental,
    octave,
    step: octave * 7 + LETTER_INDEX[letter],
    staff: octave * 7 + LETTER_INDEX[letter] >= MIDDLE_C_STEP ? "treble" : "bass",
  };
}

/** Distinct sounding pitches, low → high. */
export function staffNotes(frets: Fingering, preferFlats: boolean, pcNames?: string[]): StaffNote[] {
  const midis = new Set<number>();
  frets.forEach((f, s) => {
    if (f !== null) midis.add(midiAt(s, f));
  });
  return [...midis].sort((a, b) => a - b).map((m) => spellNote(m, preferFlats, pcNames));
}

// ---------------------------------------------------------------------------
// Geometry (SVG user units). One staff space = 8.
// ---------------------------------------------------------------------------
export const SPACE = 8;
export const HALF = SPACE / 2;
export const TREBLE_TOP = 38; // y of the treble staff's top line (F5)
const STAFF_GAP = 32; // between the treble bottom line and the bass top line
export const BASS_TOP = TREBLE_TOP + 4 * SPACE + STAFF_GAP; // y of A3 line
export const STAFF_HEIGHT = BASS_TOP + 4 * SPACE + 18;
const HEIGHT = STAFF_HEIGHT;
const LEFT = 18; // system line
export const NOTE_X = 92;
export const STAFF_WIDTH = 132;
const WIDTH = STAFF_WIDTH;
const HEAD_RX = 5.4;
const HEAD_RY = 4.1;

const TREBLE_TOP_STEP = 38; // F5
const TREBLE_BOTTOM_STEP = 30; // E4
const BASS_TOP_STEP = 26; // A3
const BASS_BOTTOM_STEP = 18; // G2

/** Lowest/highest steps reachable in standard tuning up to fret 24: E2 … E6. */
export const LOWEST_STEP = 16;
export const HIGHEST_STEP = 44;

/** Map a y coordinate (staff units) to the nearest step and the staff it belongs to. */
export function stepAtY(y: number): { step: number; staff: "treble" | "bass" } {
  const boundary = (yForStep(MIDDLE_C_STEP, "treble") + yForStep(MIDDLE_C_STEP - 1, "bass")) / 2;
  if (y < boundary) {
    const step = Math.round(TREBLE_TOP_STEP - (y - TREBLE_TOP) / HALF);
    return { step: Math.max(MIDDLE_C_STEP, Math.min(HIGHEST_STEP, step)), staff: "treble" };
  }
  const step = Math.round(BASS_TOP_STEP - (y - BASS_TOP) / HALF);
  return { step: Math.max(LOWEST_STEP, Math.min(MIDDLE_C_STEP - 1, step)), staff: "bass" };
}

export function yForStep(step: number, staff: "treble" | "bass"): number {
  return staff === "treble"
    ? TREBLE_TOP + (TREBLE_TOP_STEP - step) * HALF
    : BASS_TOP + (BASS_TOP_STEP - step) * HALF;
}

/** Ledger-line steps needed for a note (empty when it sits on the staff). */
export function ledgerSteps(step: number, staff: "treble" | "bass"): number[] {
  const top = staff === "treble" ? TREBLE_TOP_STEP : BASS_TOP_STEP;
  const bottom = staff === "treble" ? TREBLE_BOTTOM_STEP : BASS_BOTTOM_STEP;
  const out: number[] = [];
  for (let s = top + 2; s <= step; s += 2) out.push(s);
  for (let s = bottom - 2; s >= step; s -= 2) out.push(s);
  return out;
}

function n(v: number): string {
  return Number(v.toFixed(2)).toString();
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number, deg: number): string {
  const t = (deg * Math.PI) / 180;
  const x1 = cx + rx * Math.cos(t);
  const y1 = cy + rx * Math.sin(t);
  const x2 = cx - rx * Math.cos(t);
  const y2 = cy - rx * Math.sin(t);
  return `M${n(x1)} ${n(y1)}A${rx} ${ry} ${deg} 1 0 ${n(x2)} ${n(y2)}A${rx} ${ry} ${deg} 1 0 ${n(x1)} ${n(y1)}Z`;
}

/** Whole-note head: outer ellipse with a tilted hollow. */
function wholeNote(cx: number, cy: number, fill: string): string {
  const d = ellipsePath(cx, cy, HEAD_RX, HEAD_RY, -12) + ellipsePath(cx, cy, 2.05, 3.35, 55);
  return `<path d="${d}" fill="${fill}" fill-rule="evenodd"/>`;
}

function sharp(x: number, y: number, ink: string): string {
  return (
    `<path d="M${n(x - 1.6)} ${n(y - 7)}V${n(y + 8.5)}M${n(x + 1.6)} ${n(y - 8.5)}V${n(y + 7)}" stroke="${ink}" stroke-width="0.9"/>` +
    `<path d="M${n(x - 3.6)} ${n(y - 1.3)}L${n(x + 3.6)} ${n(y - 3.7)}V${n(y - 1.9)}L${n(x - 3.6)} ${n(y + 0.5)}Z` +
    `M${n(x - 3.6)} ${n(y + 3.7)}L${n(x + 3.6)} ${n(y + 1.3)}V${n(y + 3.1)}L${n(x - 3.6)} ${n(y + 5.5)}Z" fill="${ink}"/>`
  );
}

function flat(x: number, y: number, ink: string): string {
  return (
    `<path d="M${n(x - 2.4)} ${n(y - 11)}V${n(y + 4)}" stroke="${ink}" stroke-width="1"/>` +
    `<path d="M${n(x - 2.4)} ${n(y + 4)}C${n(x + 1)} ${n(y + 1.8)} ${n(x + 4.4)} ${n(y - 0.6)} ${n(x + 3.3)} ${n(y - 2.6)}` +
    `C${n(x + 2.4)} ${n(y - 4.3)} ${n(x - 0.6)} ${n(y - 3.3)} ${n(x - 2.4)} ${n(y - 1.2)}V${n(y + 0.4)}` +
    `C${n(x - 0.8)} ${n(y - 1.9)} ${n(x + 1.6)} ${n(y - 2.6)} ${n(x + 1.8)} ${n(y - 1.4)}` +
    `C${n(x + 2)} ${n(y + 0.2)} ${n(x - 0.2)} ${n(y + 2.2)} ${n(x - 2.4)} ${n(y + 3.2)}Z" fill="${ink}"/>`
  );
}

/** Treble clef; (x, gLineY) = position of the G line the spiral wraps around. */
function trebleClef(x: number, gLineY: number, ink: string): string {
  const s = SPACE / 8; // drawn on an 8-unit space grid
  const p = (dx: number, dy: number) => `${n(x + dx * s)} ${n(gLineY + dy * s)}`;
  const outline =
    `M${p(4.2, 18)}` +
    `C${p(5.2, 6)} ${p(2.6, -18)} ${p(3.6, -28)}` + // stem up
    `C${p(4.4, -34)} ${p(7.6, -38)} ${p(9.2, -37)}` + // top of the loop
    `C${p(11, -35.5)} ${p(10.6, -29)} ${p(7.6, -25.2)}` +
    `C${p(3.2, -19.4)} ${p(-4.6, -13.6)} ${p(-4.6, -4.4)}` + // big descending curve
    `C${p(-4.6, 3.2)} ${p(1, 7.4)} ${p(6.4, 7.4)}` + // bottom of the spiral
    `C${p(12, 7.4)} ${p(14.6, 3)} ${p(14, -1.2)}` +
    `C${p(13.4, -5.4)} ${p(9.6, -8.2)} ${p(5.6, -7.6)}` +
    `C${p(1.8, -7)} ${p(-0.2, -3.6)} ${p(1.4, -0.4)}`;
  const thick =
    `M${p(7.2, -24.6)}C${p(3.2, -19.4)} ${p(-3.4, -13.6)} ${p(-3.4, -4.4)}C${p(-3.4, 1.6)} ${p(0.6, 5.6)} ${p(5, 6)}`;
  const tail = `M${p(4.2, 18)}C${p(4.4, 23.4)} ${p(-1.8, 24.6)} ${p(-2.6, 20.8)}`;
  return (
    `<path d="${outline}" fill="none" stroke="${ink}" stroke-width="${n(1.35 * s)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${thick}" fill="none" stroke="${ink}" stroke-width="${n(2.6 * s)}" stroke-linecap="round"/>` +
    `<path d="${tail}" fill="none" stroke="${ink}" stroke-width="${n(1.35 * s)}" stroke-linecap="round"/>` +
    `<circle cx="${n(x - 0.6 * s)}" cy="${n(gLineY + 20.6 * s)}" r="${n(2.5 * s)}" fill="${ink}"/>`
  );
}

/** Bass clef; (x, fLineY) = the F line marked by the clef's dots. */
function bassClef(x: number, fLineY: number, ink: string): string {
  const s = SPACE / 8;
  const p = (dx: number, dy: number) => `${n(x + dx * s)} ${n(fLineY + dy * s)}`;
  const body =
    `M${p(0.4, 0.6)}` +
    `C${p(0.2, -5.6)} ${p(4.6, -9.2)} ${p(9.2, -9.2)}` +
    `C${p(15.8, -9.2)} ${p(19.6, -4.8)} ${p(19.6, 1.2)}` +
    `C${p(19.6, 10.4)} ${p(11.6, 18.2)} ${p(0.6, 23.2)}` +
    `L${p(0.2, 22.2)}` +
    `C${p(8.8, 16.6)} ${p(14.4, 10)} ${p(14.4, 1.4)}` +
    `C${p(14.4, -4.6)} ${p(12.2, -7.8)} ${p(8.6, -7.8)}` +
    `C${p(5.6, -7.8)} ${p(3, -5.8)} ${p(2.6, -2.6)}Z`;
  return (
    `<path d="${body}" fill="${ink}"/>` +
    `<circle cx="${n(x + 3.3 * s)}" cy="${n(fLineY + 0.2 * s)}" r="${n(3.3 * s)}" fill="${ink}"/>` +
    `<circle cx="${n(x + 24 * s)}" cy="${n(fLineY - 4 * s)}" r="${n(1.6 * s)}" fill="${ink}"/>` +
    `<circle cx="${n(x + 24 * s)}" cy="${n(fLineY + 4 * s)}" r="${n(1.6 * s)}" fill="${ink}"/>`
  );
}

function brace(x: number, top: number, bottom: number, ink: string): string {
  const mid = (top + bottom) / 2;
  const h = bottom - top;
  return (
    `<path d="M${n(x)} ${n(top)}` +
    `C${n(x - 7)} ${n(top + h * 0.12)} ${n(x + 1)} ${n(mid - h * 0.16)} ${n(x - 6)} ${n(mid)}` +
    `C${n(x + 1)} ${n(mid + h * 0.16)} ${n(x - 7)} ${n(bottom - h * 0.12)} ${n(x)} ${n(bottom)}` +
    `C${n(x - 4.6)} ${n(bottom - h * 0.12)} ${n(x + 3.2)} ${n(mid + h * 0.16)} ${n(x - 4.4)} ${n(mid)}` +
    `C${n(x + 3.2)} ${n(mid - h * 0.16)} ${n(x - 4.6)} ${n(top + h * 0.12)} ${n(x)} ${n(top)}Z" fill="${ink}"/>`
  );
}

export interface StaffBody {
  content: string;
  width: number;
  height: number;
}

/** Inner SVG markup for the grand staff (no outer <svg>), in its own coordinate space. */
export function renderStaffBody(frets: Fingering, opts: StaffOptions): StaffBody {
  const { ink, background, root: rootColor } = opts.colors;
  const parts: string[] = [];
  if (background) parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>`);

  const right = WIDTH - 10;
  // Staff lines
  for (const top of [TREBLE_TOP, BASS_TOP]) {
    for (let i = 0; i < 5; i++) {
      const y = top + i * SPACE;
      parts.push(`<line x1="${LEFT}" y1="${y}" x2="${right}" y2="${y}" stroke="${ink}" stroke-width="0.9"/>`);
    }
  }
  const sysBottom = BASS_TOP + 4 * SPACE;
  parts.push(
    `<line x1="${LEFT}" y1="${TREBLE_TOP}" x2="${LEFT}" y2="${sysBottom}" stroke="${ink}" stroke-width="1.2"/>`,
    `<line x1="${right}" y1="${TREBLE_TOP}" x2="${right}" y2="${sysBottom}" stroke="${ink}" stroke-width="1.2"/>`,
    brace(LEFT - 4, TREBLE_TOP, sysBottom, ink),
    trebleClef(LEFT + 9, TREBLE_TOP + 3 * SPACE, ink),
    bassClef(LEFT + 7, BASS_TOP + SPACE, ink),
  );

  const notes = opts.notes
    ? [...opts.notes].sort((a, b) => a.step - b.step || a.midi - b.midi)
    : staffNotes(frets, opts.preferFlats, opts.pcNames);
  for (const staff of ["treble", "bass"] as const) {
    const group = notes.filter((nt) => nt.staff === staff);
    if (group.length === 0) continue;

    // Seconds (adjacent steps) and same-step pairs alternate to the right of the stem line.
    const xs: number[] = [];
    group.forEach((nt, i) => {
      const prev = group[i - 1];
      const clash = prev && nt.step - prev.step <= 1 && xs[i - 1] === NOTE_X;
      xs.push(clash ? NOTE_X + HEAD_RX * 2 - 0.6 : NOTE_X);
    });

    // Ledger lines, spanning every head that needs them.
    const ledgers = new Map<number, { min: number; max: number }>();
    group.forEach((nt, i) => {
      for (const st of ledgerSteps(nt.step, staff)) {
        const e = ledgers.get(st) ?? { min: Infinity, max: -Infinity };
        e.min = Math.min(e.min, xs[i]);
        e.max = Math.max(e.max, xs[i]);
        ledgers.set(st, e);
      }
    });
    for (const [st, e] of ledgers) {
      const y = yForStep(st, staff);
      parts.push(
        `<line x1="${n(e.min - HEAD_RX - 3)}" y1="${n(y)}" x2="${n(e.max + HEAD_RX + 3)}" y2="${n(y)}" stroke="${ink}" stroke-width="0.9"/>`,
      );
    }

    // Accidentals, highest first, in columns so they don't collide.
    const columns: number[][] = [];
    const withAcc = group.filter((nt) => nt.accidental).sort((a, b) => b.step - a.step);
    for (const nt of withAcc) {
      let col = columns.findIndex((c) => c.every((st) => Math.abs(st - nt.step) >= 6));
      if (col === -1) {
        columns.push([]);
        col = columns.length - 1;
      }
      columns[col].push(nt.step);
      const x = NOTE_X - HEAD_RX - 6 - col * 9;
      const y = yForStep(nt.step, staff);
      parts.push(nt.accidental === "#" ? sharp(x, y, ink) : flat(x, y, ink));
    }

    group.forEach((nt, i) => {
      const isRoot = opts.highlightRoot && opts.root !== null && nt.midi % 12 === opts.root;
      parts.push(wholeNote(xs[i], yForStep(nt.step, staff), isRoot ? rootColor : ink));
    });
  }

  return { content: parts.join(""), width: WIDTH, height: HEIGHT };
}

/** A single translucent note (with ledgers/accidental) for hover previews. */
export function ghostNoteMarkup(nt: StaffNote, ink: string): string {
  const parts: string[] = [];
  const y = yForStep(nt.step, nt.staff);
  for (const st of ledgerSteps(nt.step, nt.staff)) {
    const ly = yForStep(st, nt.staff);
    parts.push(
      `<line x1="${n(NOTE_X - HEAD_RX - 3)}" y1="${n(ly)}" x2="${n(NOTE_X + HEAD_RX + 3)}" y2="${n(ly)}" stroke="${ink}" stroke-width="0.9"/>`,
    );
  }
  if (nt.accidental === "#") parts.push(sharp(NOTE_X - HEAD_RX - 6, y, ink));
  if (nt.accidental === "b") parts.push(flat(NOTE_X - HEAD_RX - 6, y, ink));
  parts.push(wholeNote(NOTE_X, y, ink));
  return parts.join("");
}

export function renderStaffSvg(frets: Fingering, opts: StaffOptions, scale = 1) {
  const body = renderStaffBody(frets, opts);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(body.width * scale)}" height="${n(body.height * scale)}" viewBox="0 0 ${body.width} ${body.height}">` +
    body.content +
    `</svg>`;
  return { svg, width: body.width * scale, height: body.height * scale };
}
