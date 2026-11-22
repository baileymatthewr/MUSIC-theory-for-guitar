"use client";

import { type Fingering, formatFingering, planFingering } from "@/lib/music";
import { DEFAULT_OPTIONS, type DiagramOptions, renderChordSvg } from "@/lib/diagram";
import { renderLayout } from "@/lib/compose";

/** Shared by the Barry Harris pages: one grip as a small chord box (optionally with its notation). */
export const DIM_COLORS = { ...DEFAULT_OPTIONS.colors, dot: "#c2410c", dotText: "#ffffff" };

export function display(name: string): string {
  return name.replace(/b(?=\d|°|m|$|\/)/g, "♭").replace(/([A-G])#/g, "$1♯").replace(/([A-G])b/g, "$1♭");
}

export function diagramOpts(frets: Fingering, title: string, pcNames: string[], dim: boolean): DiagramOptions {
  const plan = planFingering(frets);
  return {
    ...DEFAULT_OPTIONS,
    title,
    barre: plan.barre,
    pcNames,
    colors: dim ? DIM_COLORS : DEFAULT_OPTIONS.colors,
  };
}

export default function GripCard({
  frets,
  name,
  sub,
  pcNames,
  dim,
  withStaff,
  selected,
  onClick,
}: {
  frets: Fingering;
  name: string;
  sub?: string;
  pcNames: string[];
  dim: boolean;
  withStaff: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const opts = diagramOpts(frets, "", pcNames, dim);
  const fingers = planFingering(frets).fingers;
  const svg = withStaff
    ? renderLayout("stacked", frets, fingers, opts, { preferFlats: false, root: null, highlightRoot: false, colors: opts.colors, pcNames }, 1).svg
    : renderChordSvg(frets, fingers, opts, 1).svg;
  const body = (
    <>
      <span className="bh-card-name">{display(name)}</span>
      <span className="bh-card-img" dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="bh-card-key mono">{formatFingering(frets)}</span>
      {sub && <span className="bh-card-sub">{sub}</span>}
    </>
  );
  return onClick ? (
    <button type="button" className={`bh-card ${dim ? "dim" : ""} ${selected ? "selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      {body}
    </button>
  ) : (
    <div className={`bh-card ${dim ? "dim" : ""}`}>{body}</div>
  );
}

