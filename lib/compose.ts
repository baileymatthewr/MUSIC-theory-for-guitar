/** Combines the chord box and the grand staff into a single exportable SVG. */
import type { Fingering, Fingers } from "./music.ts";
import { type DiagramOptions, renderChordBody } from "./diagram.ts";
import { type StaffOptions, renderStaffBody } from "./staff.ts";

export type ExportLayout = "box" | "staff" | "side" | "stacked";

export const LAYOUT_LABELS: Record<ExportLayout, string> = {
  box: "Chord box only",
  staff: "Staff only",
  side: "Box + staff, side by side",
  stacked: "Box above staff",
};

export interface Rendered {
  svg: string;
  width: number;
  height: number;
}

const GAP = 6;

function n(v: number): string {
  return Number(v.toFixed(2)).toString();
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderLayout(
  layout: ExportLayout,
  frets: Fingering,
  fingers: Fingers,
  diagram: DiagramOptions,
  staff: StaffOptions,
  scale = 1,
): Rendered {
  const background = diagram.colors.background;
  // Parts are drawn without their own backgrounds; one shared background goes underneath.
  const box = renderChordBody(frets, fingers, { ...diagram, colors: { ...diagram.colors, background: null } });
  const stf = renderStaffBody(frets, { ...staff, colors: { ...staff.colors, background: null } });

  const placed: { content: string; x: number; y: number }[] = [];
  let width: number;
  let height: number;
  if (layout === "box") {
    placed.push({ content: box.content, x: 0, y: 0 });
    width = box.width;
    height = box.height;
  } else if (layout === "staff") {
    placed.push({ content: stf.content, x: 0, y: 0 });
    width = stf.width;
    height = stf.height;
  } else if (layout === "side") {
    width = box.width + GAP + stf.width;
    height = Math.max(box.height, stf.height);
    placed.push({ content: box.content, x: 0, y: (height - box.height) / 2 });
    placed.push({ content: stf.content, x: box.width + GAP, y: (height - stf.height) / 2 });
  } else {
    width = Math.max(box.width, stf.width);
    height = box.height + stf.height;
    placed.push({ content: box.content, x: (width - box.width) / 2, y: 0 });
    placed.push({ content: stf.content, x: (width - stf.width) / 2, y: box.height });
  }

  const title = diagram.title.trim();
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width * scale)}" height="${n(height * scale)}" viewBox="0 0 ${n(width)} ${n(height)}">` +
    (title ? `<title>${esc(title)}</title>` : "") +
    (background ? `<rect width="${n(width)}" height="${n(height)}" fill="${background}"/>` : "") +
    placed
      .map((p) => (p.x || p.y ? `<g transform="translate(${n(p.x)} ${n(p.y)})">${p.content}</g>` : p.content))
      .join("") +
    `</svg>`;
  return { svg, width: width * scale, height: height * scale };
}
