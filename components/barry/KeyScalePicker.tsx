"use client";

import { KEYS, SCALES, type ScaleType } from "@/lib/barryHarris";
import { display } from "./GripCard";

/** Key and scale selects, shared by the Barry Harris pages. */
export default function KeyScalePicker({
  keyName,
  type,
  onKey,
  onType,
}: {
  keyName: string;
  type: ScaleType;
  onKey: (k: string) => void;
  onType: (t: ScaleType) => void;
}) {
  return (
    <>
      <div className="field">
        <label htmlFor="bh-key">Key</label>
        <select id="bh-key" value={keyName} onChange={(e) => onKey(e.target.value)}>
          {KEYS.map((k) => (
            <option key={k} value={k}>
              {display(k)}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="bh-scale">Scale</label>
        <select id="bh-scale" value={type} onChange={(e) => onType(e.target.value as ScaleType)}>
          {(Object.keys(SCALES) as ScaleType[]).map((t) => (
            <option key={t} value={t}>
              {SCALES[t].label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

export const validKeyScale = (k: string, v: string) =>
  k === "key" ? (KEYS as readonly string[]).includes(v) : k === "scale" ? v in SCALES : true;
