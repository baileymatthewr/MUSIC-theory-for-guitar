import { test } from "node:test";
import assert from "node:assert/strict";
import { type Fingering, parseFingering } from "./music.ts";
import { chordSpelling, ledgerSteps, spellNote, staffNotes, yForStep } from "./staff.ts";
import { DEFAULT_OPTIONS } from "./diagram.ts";
import { renderLayout } from "./compose.ts";

const p = (s: string) => parseFingering(s) as Fingering;

test("low E string is E2 on the first ledger line below the bass staff", () => {
  const e2 = spellNote(40, false);
  assert.equal(e2.staff, "bass");
  assert.equal(`${e2.letter}${e2.octave}`, "E2");
  assert.deepEqual(ledgerSteps(e2.step, "bass"), [e2.step]);
  assert.ok(yForStep(e2.step, "bass") > yForStep(18, "bass")); // below G2 bottom line
});

test("high e string fret 19 is B5, above the treble staff's first ledger line", () => {
  const [b5] = staffNotes(p("x-x-x-x-x-19"), false);
  assert.equal(`${b5.letter}${b5.octave}`, "B5");
  assert.equal(b5.staff, "treble");
  assert.deepEqual(ledgerSteps(b5.step, "treble"), [40]); // A5 ledger only
});

test("middle C goes on the treble staff with one ledger line", () => {
  const c4 = spellNote(60, false);
  assert.equal(c4.staff, "treble");
  assert.deepEqual(ledgerSteps(c4.step, "treble"), [28]);
  assert.equal(spellNote(59, false).staff, "bass");
});

test("notes are de-duplicated and spelled", () => {
  // e open and B string 5th fret are both E4.
  const notes = staffNotes(p("x-x-x-x-5-0"), false);
  assert.equal(notes.length, 1);
  assert.deepEqual(
    staffNotes(p("x13331"), true).map((n) => `${n.letter}${n.accidental}${n.octave}`),
    ["Bb2", "F3", "Bb3", "D4", "F4"],
  );
});

test("combined layouts render", () => {
  const staff = { preferFlats: false, root: 0, highlightRoot: true, colors: DEFAULT_OPTIONS.colors };
  const box = renderLayout("box", p("x32010"), [null, 3, 2, null, 1, null], DEFAULT_OPTIONS, staff);
  const side = renderLayout("side", p("x32010"), [null, 3, 2, null, 1, null], DEFAULT_OPTIONS, staff);
  const stacked = renderLayout("stacked", p("x32010"), [null, 3, 2, null, 1, null], DEFAULT_OPTIONS, staff);
  assert.ok(side.width > box.width);
  assert.ok(stacked.height > box.height);
  assert.equal((side.svg.match(/<svg/g) ?? []).length, 1);
});

test("auto spelling follows the chord", () => {
  const names = (root: number, rootName: string, suffix: string, pcs: number[]) =>
    pcs.map((pc) => chordSpelling(root, rootName, suffix, false)[pc]);
  assert.deepEqual(names(0, "C", "m", [0, 3, 7]), ["C", "Eb", "G"]);
  assert.deepEqual(names(4, "E", "", [4, 8, 11]), ["E", "G#", "B"]);
  assert.deepEqual(names(10, "Bb", "7", [10, 2, 5, 8]), ["Bb", "D", "F", "Ab"]);
  assert.deepEqual(names(6, "F#", "", [6, 10, 1]), ["F#", "A#", "C#"]);
  assert.deepEqual(names(0, "C", "aug", [8]), ["G#"]);
  assert.deepEqual(names(1, "C#", "", [5]), ["E#"]); // C# major's 3rd
  const es = spellNote(65, false, chordSpelling(1, "C#", "", false));
  assert.equal(`${es.letter}${es.accidental}${es.octave}`, "E#4");
});

test("thumb renders as T, and a thumb barre as one bar", async () => {
  const { renderChordSvg } = await import("./diagram.ts");
  const { planFingering } = await import("./music.ts");
  const frets = parseFingering("3-3-5-4-6-5") as Fingering;
  const { svg } = renderChordSvg(frets, planFingering(frets).fingers, { ...DEFAULT_OPTIONS, dotLabel: "finger" });
  assert.equal((svg.match(/>T</g) ?? []).length, 1); // one label on the bar, not two
  assert.equal((svg.match(/<rect [^>]*rx=/g) ?? []).length, 1); // the thumb barre bar
});

test("fret markers sit at 3, 5, 7, 9 and double at 12", async () => {
  const { renderChordSvg } = await import("./diagram.ts");
  const count = (shape: string, inlays = true) =>
    (renderChordSvg(parseFingering(shape) as Fingering, [null, null, null, null, null, null], { ...DEFAULT_OPTIONS, inlays }).svg.match(/fill-opacity="0.28"/g) ?? []).length;
  assert.equal(count("x32010"), 1); // frets 1–4: the 3rd
  assert.equal(count("x-x-10-10-10-9"), 3); // frets 9–12: 9, and two at 12
  assert.equal(count("x-x-9-9-10-12"), 2); // 9 hidden by the D/G notes; both 12 dots visible
  assert.equal(count("x-x-10-10-10-9", false), 0);
  assert.equal(count("133211"), 0); // the 3rd-fret marker is beside the note on the D string
});
