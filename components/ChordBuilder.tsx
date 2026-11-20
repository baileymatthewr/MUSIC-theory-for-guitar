"use client";

import { useState } from "react";
import FretEditor from "./FretEditor";
import type { ChordStore, Spelling } from "./useChordStore";
import { type Fingering, formatFingering, parseFingering } from "@/lib/music";
import { type DotLabel, THEMES } from "@/lib/diagram";
import { type ExportLayout, LAYOUT_LABELS, renderLayout } from "@/lib/compose";
import { copyPng, downloadPng, downloadSvg, slugify } from "@/lib/export";
import { noteLabel, staffNotes } from "@/lib/staff";

const PRESETS: { label: string; frets: string }[] = [
  { label: "C", frets: "x32010" },
  { label: "A", frets: "x02220" },
  { label: "G", frets: "320003" },
  { label: "E", frets: "022100" },
  { label: "D", frets: "xx0232" },
  { label: "Am", frets: "x02210" },
  { label: "Em", frets: "022000" },
  { label: "Dm", frets: "xx0231" },
  { label: "F", frets: "133211" },
  { label: "Bm", frets: "x24432" },
  { label: "Cmaj7 (wide)", frets: "x-3-x-4-5-7" },
  { label: "Fmaj7 @8", frets: "x-8-10-9-10-x" },
];

const THEME_LABELS: Record<string, string> = {
  classic: "Classic (white)",
  transparent: "Black on transparent",
  dark: "Dark",
  darkTransparent: "White on transparent",
  ink: "Ink on paper",
};

const LABEL_OPTIONS: { value: DotLabel; label: string }[] = [
  { value: "none", label: "Nothing" },
  { value: "finger", label: "Fingers" },
  { value: "note", label: "Note names" },
  { value: "interval", label: "Intervals" },
];

const EMPTY: Fingering = [null, null, null, null, null, null];

// ---------------------------------------------------------------------------

export function ShapeInput({ store }: { store: ChordStore }) {
  const textValid = parseFingering(store.fingerText) !== null;
  return (
    <section className="panel input-panel" aria-label="Chord input">
      <div className="field">
        <label htmlFor="fingering">Shape</label>
        <input
          id="fingering"
          className={`mono ${textValid ? "" : "invalid"}`}
          value={store.fingerText}
          onChange={(e) => store.onFingerTextChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder="x32010 or x-10-12-12-11-10"
        />
        <p className="hint">Low E → high e. Use x for muted, dashes or spaces when frets go past 9.</p>
      </div>

      <div className="presets" aria-label="Presets">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="chip" onClick={() => store.updateFrets(parseFingering(p.frets)!)}>
            {p.label}
          </button>
        ))}
        <button type="button" className="chip ghost" onClick={() => store.updateFrets(EMPTY)}>
          Clear
        </button>
      </div>

      <FretEditor
        frets={store.frets}
        fingers={store.fingers}
        neckLength={24}
        leftHanded={store.leftHanded}
        preferFlats={store.preferFlats}
        pcNames={store.pcNames}
        onFretsChange={store.updateFrets}
        onFingerChange={store.setFinger}
      />
      <div className="finger-actions">
        <span className="hint">{store.manualFingers ? "Fingers set by hand." : "Fingers suggested automatically."}</span>
        {store.manualFingers && (
          <button type="button" className="link" onClick={() => store.setManualFingers(null)}>
            Re-suggest
          </button>
        )}
        <button type="button" className="link" onClick={store.clearFingers}>
          Clear fingers
        </button>
      </div>

      {store.warnings.length > 0 && (
        <ul className="warnings">
          {store.warnings.map((w) => (
            <li key={w.message} className={w.level}>
              {w.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

export function PreviewPanel({ store, layouts }: { store: ChordStore; layouts: ExportLayout[] }) {
  const [status, setStatus] = useState<string | null>(null);
  const layout = layouts.includes(store.combinedLayout) ? store.combinedLayout : layouts[0];
  const { frets, fingers, diagramOptions, staffOptions, scale } = store;

  const preview = renderLayout(layout, frets, fingers, diagramOptions, staffOptions, 2);
  const exported = renderLayout(layout, frets, fingers, diagramOptions, staffOptions, scale);
  const pitches = (staffOptions.notes ?? staffNotes(frets, store.preferFlats, store.pcNames)).map(noteLabel).join(" ");
  const base = store.effectiveTitle ? `${store.effectiveTitle}_${formatFingering(frets)}` : formatFingering(frets);
  const filename = slugify(layout === "box" ? base : `${base}_staff`);

  const flash = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(null), 2200);
  };
  const run = async (label: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      flash(label);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const transparent = THEMES[store.themeKey].background === null;
  const darkInk = store.themeKey === "darkTransparent";
  const win = store.fretWindow;

  return (
    <section className="panel preview-panel" aria-label="Preview">
      {layouts.length > 1 && (
        <div className="field inline">
          <label htmlFor="layout">Image</label>
          <select id="layout" value={layout} onChange={(e) => store.setCombinedLayout(e.target.value as ExportLayout)}>
            {layouts.map((k) => (
              <option key={k} value={k}>
                {LAYOUT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={`stage ${transparent ? "checker" : ""} ${transparent && darkInk ? "checker-dark" : ""}`}>
        <div
          className="diagram"
          style={{ width: preview.width * 0.8, maxWidth: "100%" }}
          dangerouslySetInnerHTML={{ __html: preview.svg.replace(/ width="[^"]+" height="[^"]+"/, ' width="100%"') }}
        />
      </div>
      <p className="meta mono">
        {formatFingering(frets)} · frets {win.start}–{win.start + win.count - 1}
        {store.match ? ` · ${store.match.name}${store.match.omitsFifth ? " (no 5th)" : ""}` : ""}
        {pitches && (
          <>
            <br />
            {pitches}
          </>
        )}
      </p>

      <div className="export">
        <div className="field inline">
          <label htmlFor="scale">PNG size</label>
          <select id="scale" value={scale} onChange={(e) => store.setScale(Number(e.target.value))}>
            {[1, 2, 3, 4, 6].map((s) => (
              <option key={s} value={s}>
                {s}× ({Math.round((exported.width / scale) * s)}×{Math.round((exported.height / scale) * s)})
              </option>
            ))}
          </select>
        </div>
        <div className="buttons">
          <button
            type="button"
            className="primary"
            onClick={() => run("PNG downloaded", () => downloadPng(exported.svg, exported.width, exported.height, filename))}
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={() =>
              run("SVG downloaded", () =>
                downloadSvg(renderLayout(layout, frets, fingers, diagramOptions, staffOptions, 1).svg, filename),
              )
            }
          >
            Download SVG
          </button>
          <button
            type="button"
            onClick={() => run("PNG copied to clipboard", () => copyPng(exported.svg, exported.width, exported.height))}
          >
            Copy image
          </button>
        </div>
        <p className="status" role="status" aria-live="polite">
          {status ?? " "}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function OptionsPanel({ store }: { store: ChordStore }) {
  return (
    <section className="panel options-panel" aria-label="Options">
      <div className="field">
        <label htmlFor="title">Chord name</label>
        <div className="with-action">
          <input
            id="title"
            value={store.effectiveTitle}
            onChange={(e) => {
              store.setTitle(e.target.value);
              store.setTitleAuto(false);
            }}
            placeholder="(no title)"
          />
          {!store.titleAuto && (
            <button type="button" className="link" onClick={() => store.setTitleAuto(true)} title="Use detected name">
              Auto
            </button>
          )}
        </div>
        {store.matches.length > 1 && (
          <div className="alts">
            <span className="hint">Also reads as:</span>
            {store.matches.slice(0, 6).map((m, i) => (
              <button
                key={m.name}
                type="button"
                className={`chip small ${i === store.matchIndex ? "selected" : ""}`}
                onClick={() => {
                  store.setMatchIndex(i);
                  store.setTitleAuto(true);
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="rows">Smallest box</label>
        <select id="rows" value={store.minRows} onChange={(e) => store.setMinRows(Number(e.target.value))}>
          {[3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n} frets
            </option>
          ))}
        </select>
        <p className="hint">Grows automatically so every note fits.</p>
      </div>

      <div className="field">
        <label htmlFor="dotlabel">Inside dots</label>
        <select id="dotlabel" value={store.dotLabel} onChange={(e) => store.setDotLabel(e.target.value as DotLabel)}>
          {LABEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="bottomlabel">Below strings</label>
        <select
          id="bottomlabel"
          value={store.bottomLabel}
          onChange={(e) => store.setBottomLabel(e.target.value as DotLabel)}
        >
          {LABEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="theme">Style</label>
        <select id="theme" value={store.themeKey} onChange={(e) => store.setThemeKey(e.target.value)}>
          {Object.keys(THEMES).map((k) => (
            <option key={k} value={k}>
              {THEME_LABELS[k] ?? k}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="spelling">Note spelling</label>
        <select id="spelling" value={store.spelling} onChange={(e) => store.setSpelling(e.target.value as Spelling)}>
          <option value="auto">Auto</option>
          <option value="sharps">Sharps (♯)</option>
          <option value="flats">Flats (♭)</option>
        </select>
      </div>

      <fieldset className="checks">
        <label>
          <input type="checkbox" checked={store.drawBarre} onChange={(e) => store.setDrawBarre(e.target.checked)} />
          Draw barre{store.detectedBarre ? ` (fret ${store.detectedBarre.fret})` : ""}
        </label>
        <label>
          <input
            type="checkbox"
            checked={store.highlightRoot}
            onChange={(e) => store.setHighlightRoot(e.target.checked)}
          />
          Highlight root
        </label>
        <label>
          <input type="checkbox" checked={store.inlays} onChange={(e) => store.setInlays(e.target.checked)} />
          Fret markers (3, 5, 7, 9, 12)
        </label>
        <label>
          <input type="checkbox" checked={store.leftHanded} onChange={(e) => store.setLeftHanded(e.target.checked)} />
          Left-handed
        </label>
      </fieldset>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** Grips and Integration share this layout; they differ in which images they produce. */
export default function ChordBuilder({ store, layouts }: { store: ChordStore; layouts: ExportLayout[] }) {
  return (
    <div className="builder">
      <ShapeInput store={store} />
      <PreviewPanel store={store} layouts={layouts} />
      <OptionsPanel store={store} />
    </div>
  );
}
