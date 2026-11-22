# Chord Box Maker

A small Next.js + TypeScript app for building guitar chord diagrams (standard tuning) and exporting them as images.

Fixed 3‑fret chord boxes often can't show wide voicings. Here the box always grows to fit the whole shape. The **Smallest box** setting is a minimum, never a crop.

## Run it

The site has three sections: `/` (home, with a short history of the guitar), `/chord-box` (the Chord Box Maker) and `/barry-harris` (Barry Harris diminished scales). The Barry Harris section has three pages, linked by a sub-menu that carries the key and scale across:

1. `/barry-harris`: **the scale** by itself, its eight notes written on the grand staff and mapped over the whole neck to the 15th fret. Home-chord notes are dark, diminished notes orange.
2. `/barry-harris/scale-grips`: **scale grips**, each scale note harmonised as a drop-2 or drop-3 grip up the neck, with the diminished chord's dominant 7th and minor 6th family.
3. `/barry-harris/inverted-grips`: **inverted grips**, contrary motion. Start from the home chord in close position (any of its four bass notes), then each step moves the top note up one scale note and the bass down one, so the grips widen while the chords alternate. The run stops when the spread can't be played. The Barry Harris pages use standard tuning.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests for chord logic (Node ≥ 22.18, no extra deps)
npm run typecheck
```

## Using it

There are four tabs, and they all share the same current chord.

### Tuning
- Every tab has a **Tuning** bar. Standard (E A D G B E) is the default. Pick a preset (half or whole step down, Drop D, Double drop D, Drop C, DADGAD, Open D, G, E, A or C), or set each string's open note yourself, from a fifth below to a fourth above its standard note.
- The tuning is shared: set it on Grips and it carries over to Notation, Chord Name and Integration, and changing it on any tab changes it everywhere. It's saved in the address (`tune=D2-A2-D3-G3-A3-D4`); links without it use standard.
- Everything follows the tuning: chord names, note labels, the clickable neck, the grand staff (down to A1), and the grip search in Notation and Chord Name.
- Every chord box prints the tuning's open notes above the strings, standard included.
- The shape presets on Grips are standard-tuning shapes, so they're hidden in other tunings.
- The Barry Harris page always uses standard tuning.

### Grips
- **Click the neck** to place a note. Click the same fret again to make that string open. The row above the nut switches a string between open (○) and muted (✕). The neck scrolls up to fret 24.
- **Or type a shape**, low E → high e: `x32010`, or with separators once frets reach two digits: `x-10-12-12-11-10`.
- The chord is **named automatically**, including slash chords and voicings without a 5th. Other readings appear as chips you can pick, or you can type your own name.
- **Fingers** are suggested automatically (including partial barres such as A-shape 1-3-3-3-1) and can be changed per string. **Barres** are detected for you.
- **Fret markers**: small dots at frets 3, 5, 7, 9 and a double dot at 12 (then 15, 17, 19, 21 and a double 24), as on a real neck. They show on the clickable neck and in chord box images. A marker right next to a note dot is hidden, as your finger would hide it. Turn them off with the "Fret markers" option.
- **Thumb (T)**: pick `T` in any string's finger menu. When four fingers aren't enough, the suggestion uses the thumb itself, in one of two ways:
  - **Over the neck** (rock/jazz grip): the thumb wraps over the top of the neck onto the low E, or barres the low E and A, level with the index finger.
  - **Thumb position** (as on cello or violin): from fret 3 up, the thumb sits in front of the neck behind the fingers, like a movable nut. It can stop any string, or lie across adjacent strings, at the lowest fret in the shape. The fingers are free above it, reaching up to 7 frets, e.g. `3-x-x-0-0-10` or `x-x-3-0-0-10`. When the thumb is well behind the fingers, the highest note gets the pinky (4).
  - The span warning measures the fingers only, not the thumb. A thumb barre is drawn as one bar labelled T. The grip search in Notation finds both kinds, ranked a little below grips that don't need the thumb.
- **Warnings** appear for shapes that are probably unplayable (stretches of 5+ frets, more than 4 fingers needed).

### Notation
- **Load notes** from the current grip ("Load current grip") or from a chord name: type it and press "Load chord" to write it out in close position, e.g. `B7/D#` → D♯3 F♯3 A3 B3.
- **Click the grand staff** to write notes. Choose ♭ Flat / ♮ Natural / ♯ Sharp first (or press `b`, `n`, `#`) for the next notes. Click a note again to remove it, click it in another mode to change it, or right-click it to switch that note between ♮, ♯ and ♭. You can also type notes: `C3 E3 G3 C4 E4`, `F#3 Bb3`.
- Pitches are **concert pitch**. The low E string is E2, on the ledger line below the bass staff. The high e string's 19th fret is B5, above the treble staff's first ledger line.
- It **guesses the chord** and lists grips:
  - **Plays exactly these pitches**: one note per string, in the octaves you wrote.
  - **Other grips**: the same chord in any octaves, keeping your bass note where possible.
- Click a grip to make it the current chord, then open it in Grips or Integration.

### Chord Name
- Type a chord symbol to get grips for it, e.g. `A`, `A Maj 7`, `Am7`, `D#o7`, `Cø`, `E7#5`, `C7(b9,#11)`, `G13`, `C6/9`, `Csus4`, `B7/D#`. It shows the chord's notes and intervals. Notes a guitarist may leave out, such as the 5th of a 13 chord, are faded. Slash chords keep the bass note lowest when they can.
- The best grip is shown straight away as a chord box beside its grand-staff notation, spelled from the chord (E7#5 shows B♯, not C). Click any other grip to switch, then download the image.
- The image takes the name you typed. Editing the grip by hand elsewhere switches back to the detected name.

### Integration
- The chord box and the grand staff together in one image: side by side, stacked, or staff only.
- If the grip plays exactly the notes you wrote in Notation, the staff keeps your spelling.

### Everywhere
- With **Auto** note spelling, notes are spelled from the chord (C minor → E♭, E major → G♯).
- **Export**: PNG at 1–6× size, SVG, or copy the PNG to the clipboard. Styles include transparent backgrounds.
- The tab, shape, notes and any custom name are saved in the URL, so you can bookmark them.

## Layout

| Path | What it is |
| --- | --- |
| `lib/music.ts` | Tuning, fingering parsing, chord naming, barre and finger suggestions, playability checks, fret‑window sizing |
| `lib/diagram.ts` | Pure function that turns a shape into an SVG string, used by both the preview and the downloads |
| `lib/staff.ts` | Grand-staff renderer (clefs, ledger lines, accidentals drawn as SVG paths, so no music font is needed) |
| `lib/barryHarris.ts` | Barry Harris scales, harmonised grips, the diminished family and contrary motion |
| `lib/neckMap.ts` | Whole-neck map of chosen notes |
| `lib/compose.ts` | Combines the box and staff into one SVG for preview and export |
| `lib/staff.ts` | Grand-staff renderer and note spelling (clefs, ledger lines, accidentals drawn as SVG paths, so no music font is needed) |
| `lib/tuning.ts` | Tuning presets, per-string ranges, spelling and the `tune=` address format |
| `lib/chordName.ts` | Chord-symbol parser (notes, intervals, which tones are optional) |
| `lib/notation.ts` | Note parsing and the grip search (exact pitches, and other voicings of the chord) |
| `lib/barryHarris.ts` | Barry Harris scales, harmonised grips, the diminished family and contrary motion |
| `lib/neckMap.ts` | Whole-neck map of chosen notes |
| `lib/compose.ts` | Combines the box and staff into one SVG for preview and export |
| `lib/export.ts` | Browser helpers: SVG → PNG via canvas, download, clipboard |
| `components/useChordStore.ts` | Shared state for all three tabs, synced to the URL |
| `components/ChordApp.tsx` | Tab bar |
| `components/ChordBuilder.tsx` | Grips and Integration views (shape input, preview and export, options) |
| `components/ChordFinder.tsx`, `VoicingCard.tsx` | Find-by-name panel and grip thumbnails |
| `components/NotationView.tsx`, `NotationStaff.tsx` | Notation tab and the clickable staff |
| `components/FretEditor.tsx` | Clickable neck |
| `components/TuningControl.tsx` | Tuning bar shared by the four tabs |
| `lib/*.test.ts` | `node:test` unit tests |
