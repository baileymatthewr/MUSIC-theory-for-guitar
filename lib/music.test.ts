// Run with: npm test  (uses Node's built-in test runner and type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectBarre,
  formatFingering,
  planFingering,
  fretWindow,
  identifyChord,
  parseFingering,
  playabilityWarnings,
  suggestFingers,
  type Fingering,
} from "./music.ts";
import { DEFAULT_OPTIONS, renderChordSvg } from "./diagram.ts";

const p = (s: string) => parseFingering(s) as Fingering;
const name = (s: string) => identifyChord(p(s))[0]?.name;

test("parses compact and separated fingerings", () => {
  assert.deepEqual(p("x32010"), [null, 3, 2, 0, 1, 0]);
  assert.deepEqual(p("x-10-12-12-11-10"), [null, 10, 12, 12, 11, 10]);
  assert.deepEqual(p("X 3 2 0 1 0"), [null, 3, 2, 0, 1, 0]);
  assert.equal(parseFingering("x3201"), null);
  assert.equal(parseFingering("x3201q"), null);
  assert.equal(formatFingering(p("x-10-12-12-11-10")), "x-10-12-12-11-10");
  assert.equal(formatFingering(p("x32010")), "x32010");
});

test("names common chords", () => {
  assert.equal(name("x32010"), "C");
  assert.equal(name("320003"), "G");
  assert.equal(name("xx0232"), "D");
  assert.equal(name("x02210"), "Am");
  assert.equal(name("022000"), "Em");
  assert.equal(name("133211"), "F");
  assert.equal(name("x24432"), "Bm");
  assert.equal(name("x32310"), "C7");
  assert.equal(name("x02010"), "Am7");
  assert.equal(name("xx0212"), "D7");
  assert.equal(name("x35555"), "C6");
  assert.equal(name("x3x453"), "Cmaj7");
  assert.equal(name("x13231"), "Bbmaj7");
  assert.equal(name("032010"), "C/E");
  assert.equal(name("x-x-0-2-3-2"), "D");
  assert.equal(name("x-8-10-9-10-x"), "Fmaj7");
  assert.equal(name("x-x-0-2-3-5"), "D5");
  assert.equal(name("x-3-x-4-5-7"), "Cmaj7"); // no 5th
});

test("barre detection", () => {
  assert.deepEqual(detectBarre(p("133211")), { fret: 1, fromString: 0, toString: 5 });
  assert.deepEqual(detectBarre(p("x24432")), { fret: 2, fromString: 1, toString: 5 });
  assert.equal(detectBarre(p("x32010")), null);
  assert.equal(detectBarre(p("320003")), null);
});

test("finger suggestions", () => {
  assert.deepEqual(suggestFingers(p("x32010"), null), [null, 3, 2, null, 1, null]);
  assert.deepEqual(suggestFingers(p("320003"), null), [2, 1, null, null, null, 3]);
  assert.deepEqual(suggestFingers(p("133211"), detectBarre(p("133211"))), [1, 3, 4, 2, 1, 1]);
  // A-shape barre: one finger covers D, G, B at fret 3.
  assert.deepEqual(suggestFingers(p("x13331"), detectBarre(p("x13331"))), [null, 1, 3, 3, 3, 1]);
});

test("fret window always contains every note", () => {
  assert.deepEqual(fretWindow(p("x32010")), { start: 1, count: 4 });
  assert.deepEqual(fretWindow(p("x-x-0-2-3-5")), { start: 1, count: 5 });
  assert.deepEqual(fretWindow(p("x-8-10-9-10-x")), { start: 8, count: 4 });
  // Wide stretch: a 3-fret box would cut this off.
  assert.deepEqual(fretWindow(p("x-3-x-4-5-7")), { start: 3, count: 5 });
  assert.deepEqual(fretWindow(p("x-3-x-4-5-7"), 3), { start: 3, count: 5 });
});

test("playability warnings", () => {
  assert.equal(playabilityWarnings(p("x32010")).length, 0);
  const w = playabilityWarnings(p("1-3-5-7-x-x"));
  assert.ok(w.some((x) => x.message.includes("Spans 7")));
  const f = playabilityWarnings(p("x-1-2-3-4-5"));
  assert.ok(f.some((x) => x.message.includes("5 fretting fingers")));
});

test("svg renders and escapes title", () => {
  const { svg, width, height } = renderChordSvg(p("x32010"), suggestFingers(p("x32010"), null), {
    ...DEFAULT_OPTIONS,
    title: "C <maj>",
  });
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.includes("C &lt;maj&gt;"));
  assert.ok(width > 0 && height > 0);
});

test("thumb on the low E string when four fingers aren't enough", () => {
  const plan = planFingering(p("3-5-4-5-6-x"));
  assert.deepEqual(plan.fingers, ["T", 2, 1, 3, 4, null]);
  assert.deepEqual(plan.thumbStrings, [0]);
  assert.equal(plan.overflow, false);
  const w = playabilityWarnings(p("3-5-4-5-6-x"));
  assert.ok(w.some((x) => x.level === "info" && x.message.includes("thumb on the low E")));
  assert.ok(!w.some((x) => x.level === "warn"));
});

test("thumb barre across E and A", () => {
  const plan = planFingering(p("3-3-5-4-6-5"));
  assert.deepEqual(plan.fingers, ["T", "T", 2, 1, 4, 3]);
  assert.deepEqual(plan.thumbStrings, [0, 1]);
  assert.ok(playabilityWarnings(p("3-3-5-4-6-5")).some((x) => x.message.includes("Thumb barres")));
});

test("thumb is not used when ordinary fingers work, or when it can't reach", () => {
  assert.deepEqual(planFingering(p("320003")).thumbStrings, []);
  assert.deepEqual(planFingering(p("133211")).thumbStrings, []);
  // Low E far behind the rest of the hand: still needs 5 fingers.
  const far = planFingering(p("1-x-5-6-7-8"));
  assert.equal(far.overflow, true);
});

test("thumb anchors a stretch from fret 3 up, with the pinky on the top note", () => {
  const plan = planFingering(p("3-x-x-0-0-10"));
  assert.deepEqual(plan.fingers, ["T", null, null, null, null, 4]);
  assert.equal(plan.overflow, false);
  const w = playabilityWarnings(p("3-x-x-0-0-10"));
  assert.ok(!w.some((x) => x.level === "warn"), JSON.stringify(w));
  assert.ok(w.some((x) => x.message.includes("7 frets")));
  // Same shape higher up.
  assert.deepEqual(planFingering(p("5-x-x-0-0-12")).fingers, ["T", null, null, null, null, 4]);
  // Two fingered notes stretched up: they take the top fingers.
  assert.deepEqual(planFingering(p("3-x-x-8-x-10")).fingers, ["T", null, null, 2, null, 4]);
  // Too near the nut for that reach.
  assert.ok(playabilityWarnings(p("2-x-x-0-0-9")).some((x) => x.level === "warn"));
  // Beyond 7 frets from the thumb.
  assert.ok(playabilityWarnings(p("3-x-x-0-0-11")).some((x) => x.level === "warn"));
});

test("thumb position (cello style): thumb on any string at the lowest fret, fingers above", () => {
  // Thumb on the D string in front of the neck, pinky on the high e.
  const d = planFingering(p("x-x-3-0-0-10"));
  assert.deepEqual(d.fingers, [null, null, "T", null, null, 4]);
  assert.equal(d.thumbStyle, "front");
  assert.ok(playabilityWarnings(p("x-x-3-0-0-10")).some((w) => w.message.startsWith("Thumb position") && w.message.includes("D string")));
  // Thumb lying across D and G (like a cellist's thumb), fingers stretching above.
  const barre = planFingering(p("x-x-5-5-8-12"));
  assert.deepEqual(barre.fingers, [null, null, "T", "T", 1, 4]);
  assert.equal(barre.thumbStyle, "front");
  // The over-the-neck grip is still preferred where it works.
  assert.equal(planFingering(p("3-5-4-5-6-x")).thumbStyle, "over");
  // Not near the nut.
  assert.ok(playabilityWarnings(p("x-x-2-0-0-9")).some((w) => w.level === "warn"));
});
