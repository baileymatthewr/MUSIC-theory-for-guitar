import { test } from "node:test";
import assert from "node:assert/strict";
import { STRING_SETS, diminishedFamily, harmonize, scaleNotes } from "./barryHarris.ts";
import { formatFingering, identifyChord, parseFingering, type Fingering } from "./music.ts";

const names = (key: string, t: Parameters<typeof scaleNotes>[1]) => scaleNotes(key, t).map((n) => n.name).join(" ");
const set = (id: string) => STRING_SETS.find((s) => s.id === id)!;

test("the four scales, spelled", () => {
  assert.equal(names("C", "major6"), "C D E F G Ab A B");
  assert.equal(names("C", "minor6"), "C D Eb F G Ab A B");
  assert.equal(names("C", "dom7"), "C D E F G Ab Bb B");
  assert.equal(names("C", "dom7b5"), "C D E F Gb Ab Bb B");
  assert.equal(names("Eb", "major6"), "Eb F G Ab Bb Cb C D");
  assert.equal(names("E", "major6"), "E F# G# A B C C# D#");
});

test("drop-2 grips on the top four strings alternate C6 and the diminished chord", () => {
  const chords = harmonize("C", "major6", set("d2-top"));
  const keys = chords.map((c) => formatFingering(c.frets));
  for (const k of ["xx0101", "xx2213", "xx5555", "xx7988", "x-x-10-12-10-12"]) assert.ok(keys.includes(k), k);
  chords.forEach((c, i) => {
    if (i > 0) assert.notEqual(c.home, chords[i - 1].home);
    const id = identifyChord(c.frets).map((m) => m.name);
    if (c.home) assert.ok(id.some((n) => n.startsWith("C6") || n.startsWith("Am7")), `${c.name} ${id}`);
    else assert.ok(id.some((n) => n.includes("dim")), `${c.name} ${id}`);
  });
});

test("every string set gives a run of playable grips in every key", () => {
  for (const key of ["C", "Db", "F#", "Bb"]) {
    for (const t of ["major6", "minor6", "dom7", "dom7b5"] as const) {
      for (const s of STRING_SETS) assert.ok(harmonize(key, t, s).length >= 8, `${key} ${t} ${s.id}`);
    }
  }
});

test("lowering a diminished note gives a dominant 7th; raising one gives a minor 6th", () => {
  const fam = diminishedFamily(parseFingering("x-x-9-10-9-10") as Fingering, "C", "major6"); // B°7
  assert.deepEqual(fam.dominants.map((d) => d.name).sort(), ["Bb7", "Db7", "E7", "G7"]);
  for (const d of fam.dominants) assert.ok(identifyChord(d.frets).some((m) => m.name.startsWith(d.name)), d.name);
  assert.deepEqual(fam.minors.map((d) => d.name).sort(), ["Abm6", "Bm6", "Dm6", "Fm6"]);
  assert.deepEqual(fam.minors.map((d) => d.move).sort(), ["Ab → A", "B → C", "D → Eb", "F → F#"]);
});
