/**
 * A horizontal map of the neck (high e on top, as in tab) with chosen notes marked on every
 * string, up to a given fret.
 */
import { DOUBLE_INLAYS, SINGLE_INLAYS, STANDARD_TUNING, STRING_COUNT, type Tuning } from "./music.ts";

export interface NeckMark {
  /** Text inside the dot, e.g. "A♭". */
  label: string;
  fill: string;
  text: string;
}

export interface NeckMapOptions {
  /** Mark for each pitch class (0–11), or null to leave it unmarked. */
  marks: (NeckMark | null)[];
  maxFret?: number;
  tuning?: Tuning;
  ink?: string;
  background?: string | null;
  fontFamily?: string;
}

function n(v: number): string {
  return Number(v.toFixed(2)).toString();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const FRET_W = 44;
const STRING_GAP = 24;
const NUT_X = 54;
const TOP = 18;
const DOT_R = 10;

export function renderNeckMap(opts: NeckMapOptions, scale = 1): { svg: string; width: number; height: number } {
  const maxFret = opts.maxFret ?? 15;
  const tuning = opts.tuning ?? STANDARD_TUNING;
  const ink = opts.ink ?? "#1a1a1a";
  const font = `font-family="${esc(opts.fontFamily ?? "Helvetica, Arial, sans-serif")}"`;
  const width = NUT_X + maxFret * FRET_W + 16;
  const bottom = TOP + (STRING_COUNT - 1) * STRING_GAP;
  const height = bottom + 34;
  // High e on top, like tab.
  const yOf = (s: number) => TOP + (STRING_COUNT - 1 - s) * STRING_GAP;
  const xOfFret = (f: number) => (f === 0 ? NUT_X - 22 : NUT_X + (f - 0.5) * FRET_W);

  const parts: string[] = [];
  if (opts.background) parts.push(`<rect width="${width}" height="${height}" fill="${opts.background}"/>`);

  // Inlays between the strings, under everything else.
  for (let f = 1; f <= maxFret; f++) {
    const x = xOfFret(f);
    const ys = DOUBLE_INLAYS.has(f) ? [yOf(4) - STRING_GAP / 2 + STRING_GAP, yOf(1) - STRING_GAP / 2] : SINGLE_INLAYS.has(f) ? [(TOP + bottom) / 2] : [];
    for (const y of ys) parts.push(`<circle cx="${n(x)}" cy="${n(y)}" r="4" fill="${ink}" fill-opacity="0.12"/>`);
  }
  // Frets and nut
  for (let f = 1; f <= maxFret; f++) {
    const x = NUT_X + f * FRET_W;
    parts.push(`<line x1="${x}" y1="${TOP}" x2="${x}" y2="${bottom}" stroke="${ink}" stroke-opacity="0.45" stroke-width="1.2"/>`);
  }
  parts.push(`<rect x="${NUT_X - 3}" y="${TOP - 1}" width="5" height="${bottom - TOP + 2}" fill="${ink}"/>`);
  // Strings, bass strings heavier.
  for (let s = 0; s < STRING_COUNT; s++) {
    parts.push(
      `<line x1="${NUT_X - 34}" y1="${yOf(s)}" x2="${NUT_X + maxFret * FRET_W}" y2="${yOf(s)}" stroke="${ink}" stroke-width="${n(0.8 + (STRING_COUNT - 1 - s) * 0.22)}"/>`,
    );
  }
  // Fret numbers
  for (let f = 1; f <= maxFret; f++) {
    if (!SINGLE_INLAYS.has(f) && !DOUBLE_INLAYS.has(f) && f !== 1) continue;
    parts.push(
      `<text x="${n(xOfFret(f))}" y="${bottom + 24}" text-anchor="middle" ${font} font-size="11" font-weight="600" fill="${ink}" fill-opacity="0.6">${f}</text>`,
    );
  }
  // Marked notes, open strings included (left of the nut).
  for (let s = 0; s < STRING_COUNT; s++) {
    for (let f = 0; f <= maxFret; f++) {
      const mark = opts.marks[(tuning[s] + f) % 12];
      if (!mark) continue;
      const x = xOfFret(f);
      const y = yOf(s);
      parts.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${DOT_R}" fill="${mark.fill}"/>`);
      parts.push(
        `<text x="${n(x)}" y="${n(y + 3.8)}" text-anchor="middle" ${font} font-size="${mark.label.length > 1 ? 9.5 : 11}" font-weight="700" fill="${mark.text}">${esc(mark.label)}</text>`,
      );
    }
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width * scale)}" height="${n(height * scale)}" viewBox="0 0 ${width} ${height}">` +
    parts.join("") +
    `</svg>`;
  return { svg, width: width * scale, height: height * scale };
}
