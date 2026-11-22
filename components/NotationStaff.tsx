"use client";

import { type MouseEvent, useRef, useState } from "react";
import {
  type Accidental,
  type StaffColors,
  type StaffNote,
  LOWEST_STEP,
  STAFF_WIDTH,
  ghostNoteMarkup,
  noteFromStep,
  noteLabel,
  renderStaffBody,
  stepAtY,
  yForStep,
} from "@/lib/staff";
import type { Tuning } from "@/lib/music";

// Tall enough to click notes down to A1 (low tunings).
const STAFF_HEIGHT = Math.ceil(yForStep(LOWEST_STEP, "bass") + 12);
import { inGuitarRange } from "@/lib/notation";

interface Props {
  notes: StaffNote[];
  accidental: Accidental;
  tuning?: Tuning;
  colors: StaffColors;
  onToggleStep: (step: number) => void;
  /** Right-click: cycle the accidental of the note on this step (♮ → ♯ → ♭). */
  onCycleStep: (step: number) => void;
}

/** Grand staff you can click on: click a line or space to add a note, click it again to remove it. */
export default function NotationStaff({ notes, accidental, tuning, colors, onToggleStep, onCycleStep }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const stepFromEvent = (e: MouseEvent<SVGSVGElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return null;
    return stepAtY(((e.clientY - r.top) * STAFF_HEIGHT) / r.height).step;
  };

  const body = renderStaffBody([null, null, null, null, null, null], {
    preferFlats: false,
    root: null,
    highlightRoot: false,
    colors,
    notes,
    minHeight: STAFF_HEIGHT,
  });

  const hoverNote = hover !== null ? noteFromStep(hover, accidental) : null;
  const hoverExisting = hover !== null ? notes.find((n) => n.step === hover) : undefined;
  const hoverOk = hoverNote ? inGuitarRange(hoverNote, tuning) : false;

  return (
    <div className="notation-staff">
      <svg
        ref={ref}
        viewBox={`0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`}
        width="100%"
        style={{ maxWidth: STAFF_WIDTH * 3, cursor: hoverOk ? "pointer" : "not-allowed" }}
        onMouseMove={(e) => setHover(stepFromEvent(e))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => {
          const step = stepFromEvent(e);
          if (step !== null) onToggleStep(step);
        }}
        onContextMenu={(e) => {
          const step = stepFromEvent(e);
          if (step !== null && notes.some((n) => n.step === step)) {
            e.preventDefault();
            onCycleStep(step);
          }
        }}
        role="img"
        aria-label={`Grand staff with ${notes.length} note${notes.length === 1 ? "" : "s"}`}
      >
        <g dangerouslySetInnerHTML={{ __html: body.content }} />
        {hoverNote && !hoverExisting && hoverOk && (
          <g opacity={0.35} pointerEvents="none" dangerouslySetInnerHTML={{ __html: ghostNoteMarkup(hoverNote, colors.ink) }} />
        )}
        {hoverNote && (
          <text x={STAFF_WIDTH - 12} y={14} textAnchor="end" fontSize={9} fill={hoverOk ? "#6f695f" : "#b91c1c"} fontFamily="Helvetica, Arial, sans-serif">
            {hoverExisting
              ? hoverExisting.accidental === accidental
                ? `remove ${noteLabel(hoverExisting)} · right-click: ♮/♯/♭`
                : `change to ${noteLabel(hoverNote)}`
              : hoverOk
                ? `add ${noteLabel(hoverNote)}`
                : `${noteLabel(hoverNote)} is out of range`}
          </text>
        )}
      </svg>
    </div>
  );
}
