import { test } from "node:test";
import assert from "node:assert/strict";
import { progression, startingGrips, triadGrips } from "./pianoExercises.ts";
import { formatFingering, identifyChord } from "./music.ts";

const keys = (key: string, start: number, order?: Parameters<typeof progression>[2]) =>
  progression(key, startingGrips(key)[start], order).map((s) => `${s.grip.name} ${formatFingering(s.grip.frets)}`);

test("triads on strings 4-3-2 are close, playable and correctly named", () => {
  for (const key of ["C", "F#", "Bb"]) {
    for (const d of ["I", "IV", "V"] as const) {
      for (const g of triadGrips(key, d)) {
        assert.ok(g.midis[2] - g.midis[0] < 12, "close position");
        // Same chord as the general chord namer finds (which may spell it enharmonically, e.g. Db for C#).
        const best = identifyChord(g.frets)[0];
        const rootPc = (g.midis.find((m, i) => g.notes[i] === g.name.split("/")[0]) as number) % 12;
        assert.equal(best.suffix, "", g.name);
        assert.equal(best.root, rootPc, g.name);
      }
    }
  }
});

test("the classic piano voicings in C", () => {
  assert.deepEqual(keys("C", 0), ["C x-x-10-9-8-x", "F/C x-x-10-10-10-x", "G/B xx978x", "C x-x-10-9-8-x"]);
  assert.deepEqual(keys("C", 2), ["C/G xx555x", "F/A xx756x", "G xx543x", "C/G xx555x"]);
});

test("I to IV keeps one note and moves the others by a step or two", () => {
  for (const key of ["C", "D", "Eb", "A"]) {
    for (const start of startingGrips(key)) {
      const [, iv] = progression(key, start, ["I", "IV"]);
      const moves = iv.moves.map((m) => m.frets).sort((a, b) => Math.abs(a) - Math.abs(b));
      assert.equal(moves[0], 0, "a common tone stays");
      assert.ok(moves.every((m) => Math.abs(m) <= 2), `${key} ${start.name}: ${moves}`);
    }
  }
});

test("other orders", () => {
  assert.deepEqual(
    keys("C", 0, ["I", "IV", "I", "V", "I"]).map((s) => s.split(" ")[0]),
    ["C", "F/C", "C", "G/B", "C"],
  );
});
