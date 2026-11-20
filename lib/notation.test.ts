import { test } from "node:test";
import assert from "node:assert/strict";
import { chordVoicings, exactVoicings, formatNotes, parseNotes } from "./notation.ts";
import { formatFingering, identifyPitches } from "./music.ts";
import { noteFromStep, stepAtY, yForStep } from "./staff.ts";

const midis = (s: string) => parseNotes(s)!.map((n) => n.midi);
const keys = (vs: { frets: (number | null)[] }[]) => vs.map((v) => formatFingering(v.frets));

test("parses and formats note names", () => {
  assert.deepEqual(midis("E2 B5"), [40, 83]);
  assert.deepEqual(midis("c#4, Bb3"), [61, 58]);
  assert.equal(parseNotes("H2"), null);
  assert.equal(formatNotes(parseNotes("G3 C3 E3")!), "C3 E3 G3");
});

test("staff positions round-trip through click coordinates", () => {
  for (const step of [16, 18, 26, 27, 28, 30, 38, 41, 44]) {
    const staff = step >= 28 ? "treble" : "bass";
    assert.equal(stepAtY(yForStep(step, staff)).step, step);
  }
  assert.equal(noteFromStep(16, "").midi, 40); // E2
  assert.equal(noteFromStep(41, "").midi, 83); // B5
  assert.equal(noteFromStep(29, "b").midi, 61); // Db4
});

test("guesses chord names from written pitches", () => {
  assert.equal(identifyPitches(midis("C3 E3 G3"))[0].name, "C");
  assert.equal(identifyPitches(midis("E3 G3 C4"))[0].name, "C/E");
  assert.equal(identifyPitches(midis("D3 F#3 A3 C4"))[0].name, "D7");
});

test("finds the standard grips for exact pitches", () => {
  assert.ok(keys(exactVoicings(midis("C3 E3 G3 C4 E4"))).includes("x32010"));
  assert.deepEqual(keys(exactVoicings(midis("G2 B2 D3 G3 B3 G4"))), ["320003"]);
  assert.deepEqual(keys(exactVoicings(midis("F2 C3 F3 A3 C4 F4"))), ["133211"]);
  assert.ok(keys(exactVoicings(midis("E2 B5"))).includes("0-x-x-x-x-19"));
  assert.deepEqual(exactVoicings(midis("C3 D3 E3 F3 G3 A3 B3")), []); // 7 notes, 6 strings
});

test("suggests other voicings of the same chord, keeping the bass", () => {
  const c = keys(chordVoicings(midis("C3 E3 G3")));
  for (const k of ["x32010", "x35553", "8-10-10-9-8-8"]) assert.ok(c.includes(k), k);
  for (const v of chordVoicings(midis("E3 G3 C4"))) {
    const lowest = v.frets.findIndex((f) => f !== null);
    assert.equal((40 + [0, 5, 10, 15, 19, 24][lowest] + (v.frets[lowest] as number)) % 12, 4); // E in the bass
  }
});

test("grip search finds thumb-stretch grips", () => {
  // G2 G3 B3 D5 = 3-x-x-0-0-10
  assert.ok(keys(exactVoicings([43, 55, 59, 74])).includes("3-x-x-0-0-10"));
});

test("grip search finds thumb-position grips on other strings", () => {
  // D-string thumb: D at fret 3 = F3, then open G and B, high e 10 = D5.
  const notes = [53, 55, 59, 74];
  const all = [...exactVoicings(notes), ...chordVoicings(notes)].map((v) => formatFingering(v.frets));
  assert.ok(all.includes("x-x-3-0-0-10"), all.join(" "));
});
