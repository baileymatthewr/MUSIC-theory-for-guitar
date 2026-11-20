import { test } from "node:test";
import assert from "node:assert/strict";
import { chordPcNames, chordQuery, chordToPitches, parseChordName } from "./chordName.ts";
import { searchVoicings } from "./notation.ts";
import { formatFingering } from "./music.ts";

const notes = (s: string) => {
  const r = parseChordName(s);
  assert.ok(r.ok, `${s}: ${r.ok ? "" : r.error}`);
  return r.ok ? r.chord.noteNames.join(" ") : "";
};
const grips = (s: string) => {
  const r = parseChordName(s);
  assert.ok(r.ok);
  return r.ok ? searchVoicings(chordQuery(r.chord), 18).voicings.map((v) => formatFingering(v.frets)) : [];
};

test("parses the examples and spells the notes", () => {
  assert.equal(notes("A"), "A C# E");
  assert.equal(notes("A Maj 7"), "A C# E G#");
  assert.equal(notes("AMaj7"), "A C# E G#");
  assert.equal(notes("AΔ7"), "A C# E G#");
  assert.equal(notes("D#o7"), "D# F# A C");
  assert.equal(notes("D#°7"), "D# F# A C");
  assert.equal(notes("E7#5"), "E G# B# D");
  assert.equal(notes("B7/D#"), "B D# F# A");
});

test("parses other common symbols", () => {
  assert.equal(notes("Am"), "A C E");
  assert.equal(notes("A-7"), "A C E G");
  assert.equal(notes("Bbm7b5"), "Bb Db Fb Ab");
  assert.equal(notes("Cø"), "C Eb Gb Bb");
  assert.equal(notes("Cdim"), "C Eb Gb");
  assert.equal(notes("C+"), "C E G#");
  assert.equal(notes("Caug7"), "C E G# Bb");
  assert.equal(notes("Csus4"), "C F G");
  assert.equal(notes("C7sus4"), "C F G Bb");
  assert.equal(notes("Csus2"), "C D G");
  assert.equal(notes("C5"), "C G");
  assert.equal(notes("C6"), "C E G A");
  assert.equal(notes("C6/9"), "C E G A D");
  assert.equal(notes("Cadd9"), "C E G D");
  assert.equal(notes("Cmadd9"), "C Eb G D");
  assert.equal(notes("CmMaj7"), "C Eb G B");
  assert.equal(notes("C9"), "C E G Bb D");
  assert.equal(notes("C7b9"), "C E G Bb Db");
  assert.equal(notes("C7#9"), "C E G Bb D#");
  assert.equal(notes("C7(b9,#11)"), "C E G Bb Db F#");
  assert.equal(notes("Cmaj7#11"), "C E G B F#");
  assert.equal(notes("C13"), "C E G Bb D A");
  assert.equal(notes("C/G"), "C E G");
  assert.equal(notes("D/C"), "D F# A C"); // bass outside the chord
  assert.equal(notes("F#m"), "F# A C#");
  assert.equal(notes("c#m7"), "C# E G# B");
});

test("rejects nonsense with a helpful message", () => {
  const r = parseChordName("Cxyz");
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.error.includes("xyz"));
  assert.equal(parseChordName("H7").ok, false);
  assert.equal(parseChordName("").ok, false);
});

test("finds the familiar grips", () => {
  assert.ok(grips("A").includes("x02220"));
  assert.ok(grips("Amaj7").includes("x02120"));
  assert.ok(grips("C").includes("x32010"));
  assert.ok(grips("E7").includes("020100"));
  assert.ok(grips("F").includes("133211"));
  assert.ok(grips("Bm7b5").includes("x2323x"));
  assert.ok(grips("D/F#").includes("200232"));
  assert.ok(grips("D#o7").length > 0);
  assert.ok(grips("E7#5").length > 0);
  assert.ok(grips("C13").length > 0);
});

test("slash chords keep the bass note lowest", () => {
  for (const g of grips("B7/D#")) {
    const frets = g.length === 6 ? g.split("") : g.split("-");
    const lowest = frets.findIndex((f) => f !== "x");
    assert.equal((40 + [0, 5, 10, 15, 19, 24][lowest] + Number(frets[lowest])) % 12, 3, g);
  }
});

test("writes a chord out in close position for the staff", () => {
  const w = (name: string) => {
    const r = parseChordName(name);
    assert.ok(r.ok);
    return r.ok ? chordToPitches(r.chord).map((p) => `${p.name}${p.midi}`).join(" ") : "";
  };
  assert.equal(w("C"), "C48 E52 G55");
  assert.equal(w("E7#5"), "E52 G#56 B#60 D62");
  assert.equal(w("B7/D#"), "D#51 F#54 A57 B59"); // D# in the bass, root just above
  assert.equal(w("D/C"), "C48 D50 F#54 A57");
  assert.equal(w("C13"), "C48 E52 G55 Bb58 D62 A69"); // 9 and 13 an octave up
  assert.equal(w("C7(b9,#11)/E"), "E52 G55 Bb58 C60 F#66 Db73");
  assert.equal(w("C7(b9,#11)/D").split(" ").length, 6); // 7 notes → optional 5th dropped
  assert.equal(w("C9").split(" ").length, 5);
});

test("chord spelling is used for the staff", () => {
  const r = parseChordName("E7#5");
  assert.ok(r.ok);
  if (r.ok) assert.equal(chordPcNames(r.chord)[0], "B#");
});
