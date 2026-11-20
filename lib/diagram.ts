/**
 * Renders a chord box as a standalone SVG string. The same string is used for the
 * on-screen preview and for downloads, so what you see is exactly what you export.
 */
import {
  type Barre,
  type Fingering,
  type Fingers,
  DOUBLE_INLAYS,
  SINGLE_INLAYS,
  STRING_COUNT,
  fretWindow,
  intervalName,
  midiAt,
  pitchClassName,
} from "./music.ts";

export type DotLabel = "none" | "finger" | "note" | "interval";

export interface DiagramColors {
  /** Lines, markers and text. */
  ink: string;
  /** Background, or null for transparent. */
  background: string | null;
  dot: string;
  dotText: string;
  /** Fill for root-note dots when highlightRoot is on. */
  root: string;
}

export interface DiagramOptions {
  title: string;
  /** Smallest number of fret rows to draw; grows automatically to fit the shape. */
  minRows: number;
  dotLabel: DotLabel;
  bottomLabel: DotLabel;
  barre: Barre | null;
  leftHanded: boolean;
  highlightRoot: boolean;
  /** Small fret-marker dots (3, 5, 7, 9, double 12…) as on a real neck. */
  inlays: boolean;
  /** Root pitch class for intervals / highlighting, or null if unknown. */
  root: number | null;
  preferFlats: boolean;
  /** Optional spelling per pitch class (index 0–11); overrides preferFlats. */
  pcNames?: string[];
  colors: DiagramColors;
  fontFamily: string;
}

export const THEMES: Record<string, DiagramColors> = {
  classic: { ink: "#1a1a1a", background: "#ffffff", dot: "#1a1a1a", dotText: "#ffffff", root: "#c2410c" },
  transparent: { ink: "#1a1a1a", background: null, dot: "#1a1a1a", dotText: "#ffffff", root: "#c2410c" },
  dark: { ink: "#f2efe8", background: "#17171a", dot: "#f2efe8", dotText: "#17171a", root: "#fb923c" },
  darkTransparent: { ink: "#f2efe8", background: null, dot: "#f2efe8", dotText: "#17171a", root: "#fb923c" },
  ink: { ink: "#1e2a44", background: "#f7f3ea", dot: "#1e2a44", dotText: "#f7f3ea", root: "#b4442c" },
};

export const DEFAULT_OPTIONS: DiagramOptions = {
  title: "",
  minRows: 4,
  dotLabel: "finger",
  bottomLabel: "none",
  barre: null,
  leftHanded: false,
  inlays: true,
  highlightRoot: false,
  root: null,
  preferFlats: false,
  colors: THEMES.classic,
  fontFamily: "Helvetica, Arial, sans-serif",
};

// Geometry, in SVG user units.
const STRING_GAP = 22;
const FRET_GAP = 28;
const DOT_R = 9;
const SIDE_PAD = 42; // room for the "12fr" label clear of a dot on the outer string
const MARKER_H = 22;
const NUT_H = 5;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function n(v: number): string {
  return Number(v.toFixed(2)).toString();
}

export interface RenderedDiagram {
  svg: string;
  width: number;
  height: number;
}

export interface DiagramBody {
  content: string;
  width: number;
  height: number;
}

export function renderChordSvg(
  frets: Fingering,
  fingers: Fingers,
  opts: DiagramOptions,
  scale = 1,
): RenderedDiagram {
  const body = renderChordBody(frets, fingers, opts);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(body.width * scale)}" height="${n(body.height * scale)}" viewBox="0 0 ${body.width} ${body.height}">` +
    (opts.title.trim() ? `<title>${esc(opts.title.trim())}</title>` : "") +
    body.content +
    `</svg>`;
  return { svg, width: body.width * scale, height: body.height * scale };
}

/** Inner SVG markup for the chord box (no outer <svg>), in its own coordinate space. */
export function renderChordBody(frets: Fingering, fingers: Fingers, opts: DiagramOptions): DiagramBody {
  const { colors, fontFamily } = opts;
  const win = fretWindow(frets, opts.minRows);
  const showNut = win.start === 1;

  const gridW = (STRING_COUNT - 1) * STRING_GAP;
  const gridH = win.count * FRET_GAP;
  const titleH = opts.title.trim() ? 36 : 8;
  const bottomH = opts.bottomLabel !== "none" ? 24 : 10;

  const width = SIDE_PAD * 2 + gridW;
  const gridTop = titleH + MARKER_H;
  const height = gridTop + gridH + bottomH;

  const xOf = (s: number) => SIDE_PAD + (opts.leftHanded ? STRING_COUNT - 1 - s : s) * STRING_GAP;
  const yOfFret = (f: number) => gridTop + (f - win.start + 0.5) * FRET_GAP;

  const labelFor = (s: number, kind: DotLabel): string => {
    const f = frets[s];
    if (f === null || kind === "none") return "";
    const pc = midiAt(s, f) % 12;
    if (kind === "finger") return fingers[s] ? String(fingers[s]) : "";
    if (kind === "note") return opts.pcNames?.[pc] ?? pitchClassName(pc, opts.preferFlats);
    if (kind === "interval") return opts.root === null ? "" : intervalName(pc, opts.root);
    return "";
  };
  const isRoot = (s: number) => {
    const f = frets[s];
    return opts.highlightRoot && opts.root !== null && f !== null && midiAt(s, f) % 12 === opts.root;
  };

  const parts: string[] = [];
  const font = `font-family="${esc(fontFamily)}"`;

  if (colors.background) {
    parts.push(`<rect width="${width}" height="${height}" fill="${colors.background}"/>`);
  }

  // Title
  if (opts.title.trim()) {
    parts.push(
      `<text x="${n(width / 2)}" y="26" text-anchor="middle" ${font} font-size="21" font-weight="700" fill="${colors.ink}">${esc(opts.title.trim())}</text>`,
    );
  }

  // Frets (horizontal lines)
  for (let i = 0; i <= win.count; i++) {
    const y = gridTop + i * FRET_GAP;
    parts.push(
      `<line x1="${SIDE_PAD}" y1="${n(y)}" x2="${SIDE_PAD + gridW}" y2="${n(y)}" stroke="${colors.ink}" stroke-width="1.5" stroke-linecap="square"/>`,
    );
  }
  // Nut
  if (showNut) {
    parts.push(
      `<rect x="${SIDE_PAD - 0.75}" y="${n(gridTop - NUT_H)}" width="${gridW + 1.5}" height="${NUT_H + 0.75}" fill="${colors.ink}"/>`,
    );
  } else {
    // Starting fret label beside the first row.
    const labelX = opts.leftHanded ? SIDE_PAD + gridW + DOT_R + 3 : SIDE_PAD - DOT_R - 3;
    const anchor = opts.leftHanded ? "start" : "end";
    parts.push(
      `<text x="${labelX}" y="${n(gridTop + FRET_GAP / 2 + 4.5)}" text-anchor="${anchor}" ${font} font-size="13" font-weight="600" fill="${colors.ink}">${win.start}fr</text>`,
    );
  }
  // Fret markers, drawn under everything else: single dots between the D and G strings,
  // double dots between A–D and G–B, like the inlays on a real neck.
  if (opts.inlays) {
    for (let f = win.start; f < win.start + win.count; f++) {
      const y = yOfFret(f);
      const xs = DOUBLE_INLAYS.has(f)
        ? [SIDE_PAD + 1.5 * STRING_GAP, SIDE_PAD + 3.5 * STRING_GAP]
        : SINGLE_INLAYS.has(f)
          ? [SIDE_PAD + 2.5 * STRING_GAP]
          : [];
      for (const x of xs) {
        // Like a fingertip on a real neck, a note dot right beside the marker hides it.
        const hidden = frets.some((fr, st) => fr === f && Math.abs(xOf(st) - x) < DOT_R + 4);
        if (!hidden) {
          parts.push(`<circle cx="${n(x)}" cy="${n(y)}" r="2.6" fill="${colors.ink}" fill-opacity="0.28"/>`);
        }
      }
    }
  }

  // Strings (vertical lines), bass strings slightly heavier.
  for (let s = 0; s < STRING_COUNT; s++) {
    const x = xOf(s);
    const w = 1.1 + (STRING_COUNT - 1 - s) * 0.18;
    parts.push(
      `<line x1="${x}" y1="${n(gridTop)}" x2="${x}" y2="${n(gridTop + gridH)}" stroke="${colors.ink}" stroke-width="${n(w)}"/>`,
    );
  }

  // Open / muted markers
  const markerY = gridTop - (showNut ? NUT_H : 0) - MARKER_H / 2 + 1;
  for (let s = 0; s < STRING_COUNT; s++) {
    const x = xOf(s);
    const f = frets[s];
    if (f === null) {
      const d = 5;
      parts.push(
        `<path d="M${x - d} ${n(markerY - d)}L${x + d} ${n(markerY + d)}M${x + d} ${n(markerY - d)}L${x - d} ${n(markerY + d)}" stroke="${colors.ink}" stroke-width="1.8" stroke-linecap="round"/>`,
      );
    } else if (f === 0) {
      const stroke = isRoot(s) ? colors.root : colors.ink;
      parts.push(
        `<circle cx="${x}" cy="${n(markerY)}" r="5.5" fill="none" stroke="${stroke}" stroke-width="${isRoot(s) ? 2.4 : 1.8}"/>`,
      );
    }
  }

  const dotText = (x: number, y: number, label: string, fill: string) =>
    label
      ? `<text x="${n(x)}" y="${n(y + 4.2)}" text-anchor="middle" ${font} font-size="${label.length > 1 ? 10.5 : 12}" font-weight="700" fill="${fill}">${esc(label)}</text>`
      : "";

  // Barre
  const barre = opts.barre;
  const onBarre = (s: number) =>
    !!barre && s >= barre.fromString && s <= barre.toString && frets[s] === barre.fret;
  if (barre) {
    const xa = xOf(barre.fromString);
    const xb = xOf(barre.toString);
    const x1 = Math.min(xa, xb) - DOT_R;
    const x2 = Math.max(xa, xb) + DOT_R;
    const y = yOfFret(barre.fret);
    parts.push(
      `<rect x="${n(x1)}" y="${n(y - DOT_R)}" width="${n(x2 - x1)}" height="${DOT_R * 2}" rx="${DOT_R}" fill="${colors.dot}"/>`,
    );
    if (opts.dotLabel === "finger") {
      const f = fingers[barre.fromString] ?? fingers[barre.toString];
      if (f) parts.push(dotText((x1 + x2) / 2, y, String(f), colors.dotText));
    }
  }

  // Thumb barre: adjacent strings both fretted by the thumb on the same fret.
  let thumbRun: number[] = [];
  for (let st = 0; st < STRING_COUNT && thumbRun.length < 2; st++) {
    const f = frets[st];
    const isThumb = fingers[st] === "T" && f !== null && f > 0;
    const continues = isThumb && thumbRun.length > 0 && frets[thumbRun[0]] === f;
    thumbRun = continues ? [...thumbRun, st] : isThumb ? [st] : [];
  }
  // Extend the run as far as it goes.
  for (let st = (thumbRun[thumbRun.length - 1] ?? STRING_COUNT) + 1; thumbRun.length >= 2 && st < STRING_COUNT; st++) {
    if (fingers[st] === "T" && frets[st] === frets[thumbRun[0]]) thumbRun.push(st);
    else break;
  }
  const onThumbBarre = (st: number) => thumbRun.length >= 2 && thumbRun.includes(st);
  if (thumbRun.length >= 2) {
    const xa = xOf(thumbRun[0]);
    const xb = xOf(thumbRun[thumbRun.length - 1]);
    const x1 = Math.min(xa, xb) - DOT_R;
    const x2 = Math.max(xa, xb) + DOT_R;
    const y = yOfFret(frets[thumbRun[0]] as number);
    parts.push(
      `<rect x="${n(x1)}" y="${n(y - DOT_R)}" width="${n(x2 - x1)}" height="${DOT_R * 2}" rx="${DOT_R}" fill="${colors.dot}"/>`,
    );
    if (opts.dotLabel === "finger") parts.push(dotText((x1 + x2) / 2, y, "T", colors.dotText));
  }

  // Fretted dots
  for (let s = 0; s < STRING_COUNT; s++) {
    const f = frets[s];
    if (f === null || f === 0) continue;
    const x = xOf(s);
    const y = yOfFret(f);
    const root = isRoot(s);
    const covered = onBarre(s) || onThumbBarre(s);
    if (!covered || root) {
      parts.push(`<circle cx="${x}" cy="${n(y)}" r="${DOT_R}" fill="${root ? colors.root : colors.dot}"/>`);
    }
    if (!(covered && opts.dotLabel === "finger")) {
      parts.push(dotText(x, y, labelFor(s, opts.dotLabel), colors.dotText));
    }
  }

  // Bottom labels
  if (opts.bottomLabel !== "none") {
    const y = gridTop + gridH + 17;
    for (let s = 0; s < STRING_COUNT; s++) {
      const label = labelFor(s, opts.bottomLabel);
      if (!label) continue;
      parts.push(
        `<text x="${xOf(s)}" y="${n(y)}" text-anchor="middle" ${font} font-size="11.5" font-weight="500" fill="${colors.ink}">${esc(label)}</text>`,
      );
    }
  }

  return { content: parts.join(""), width, height };
}
