import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STANDARD,
  TUNING_PRESETS,
  findPreset,
  formatTuningParam,
  isStandard,
  parseTuningParam,
  presetTuning,
  tuningLetters,
  tuningName,
} from "./tuning.ts";
import { type Fingering, formatFingering, identifyChord, parseFingering, playabilityWarnings, planFingering } from "./music.ts";
import { exactVoicings, guitarRange, searchVoicings } from "./notation.ts";
import { chordQuery, parseChordName } from "./chordName.ts";
import { DEFAULT_OPTIONS, renderChordSvg } from "./diagram.ts";
import { staffNotes } from "./staff.ts";

const tune = (id: string) => presetTuning(TUNING_PRESETS.find((p) => p.id === id)!);
const p = (s: string) => parseFingering(s) as Fingering;
const grips = (name: string, id: string) => {
  const r = parseChordName(name);
  assert.ok(r.ok);
  return r.ok ? searchVoicings(chordQuery(r.chord), 24, new Set(), tune(id)).voicings.map((v) => formatFingering(v.frets)) : [];
};

test("presets, names and the address round-trip", () => {
  assert.ok(isStandard(tune("standard")));
  assert.equal(tuningName(STANDARD), "Standard");
  assert.equal(tuningName(tune("dadgad")), "DADGAD");
  assert.deepEqual(tuningLetters(tune("half-down")), ["Eb", "Ab", "Db", "Gb", "Bb", "Eb"]);
  for (const preset of TUNING_PRESETS) {
    const t = presetTuning(preset);
    assert.deepEqual(parseTuningParam(formatTuningParam(t)), t, preset.id);
    assert.equal(findPreset(t)?.id, preset.id);
  }
  // A custom tuning: drop the B string to Bb.
  const custom = [40, 45, 50, 55, 58, 64];
  assert.equal(findPreset(custom), null);
  assert.equal(tuningName(custom), "E A D G Bb E");
  assert.deepEqual(parseTuningParam("E2-A2-D3-G3-Bb3-E4"), custom);
  assert.equal(parseTuningParam("E2-A2-D3"), null);
  assert.equal(parseTuningParam("E9-A2-D3-G3-B3-E4"), null); // out of range
});

test("open strings name the tuning's chord", () => {
  assert.equal(identifyChord(p("000000"), tune("open-g"))[0].name, "G/D");
  assert.equal(identifyChord(p("x00000"), tune("open-g"))[0].name, "G");
  assert.equal(identifyChord(p("000000"), tune("open-d"))[0].name, "D");
  assert.equal(identifyChord(p("000000"), tune("open-e"))[0].name, "E");
  assert.equal(identifyChord(p("000000"), tune("dadgad"))[0].name, "Dsus4");
  // The same shape means a different chord in another tuning.
  assert.equal(identifyChord(p("x32010"), tune("whole-down"))[0].name, "Bb");
});

test("grip search works in other tunings", () => {
  assert.ok(grips("D", "drop-d").includes("000232"));
  assert.ok(grips("G", "open-g").includes("x00000"));
  assert.ok(grips("G/D", "open-g").includes("000000"));
  assert.ok(grips("D5", "drop-d").some((g) => /^(\d)\1\1/.test(g) || g.startsWith("000"))); // one-finger power chord
  assert.ok(exactVoicings([38, 45, 50], 8, tune("drop-d")).some((v) => formatFingering(v.frets) === "000xxx"));
});

test("range, staff and messages follow the tuning", () => {
  assert.deepEqual(guitarRange(tune("drop-c")), { min: 36, max: 86 });
  const low = staffNotes(p("0xxxxx"), false, undefined, tune("drop-c"))[0];
  assert.equal(`${low.letter}${low.octave}`, "C2");
  const w = playabilityWarnings(p("3-5-4-5-6-x"), planFingering(p("3-5-4-5-6-x")), tune("drop-d"));
  assert.ok(w.some((x) => x.message.includes("low D string")), JSON.stringify(w));
});

test("the chord box always prints the tuning above the strings", () => {
  const svg = (t: readonly number[]) => renderChordSvg(p("000000"), [null, null, null, null, null, null], { ...DEFAULT_OPTIONS, tuning: t }).svg;
  const letters = (s: string) => [...s.matchAll(/fill-opacity="0.65">([^<]+)</g)].map((m) => m[1]).join(" ");
  assert.equal(letters(svg(STANDARD)), "E A D G B E");
  assert.equal(letters(svg(tune("dadgad"))), "D A D G A D");
  assert.equal(letters(svg(tune("half-down"))), "E♭ A♭ D♭ G♭ B♭ E♭");
  assert.equal(letters(renderChordSvg(p("000000"), [null, null, null, null, null, null], DEFAULT_OPTIONS).svg), "E A D G B E");
});
