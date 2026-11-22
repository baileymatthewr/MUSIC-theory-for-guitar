"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  type Fingering,
  type Finger,
  type Fingers,
  emptyFingers,
  formatFingering,
  fretWindow,
  identifyChord,
  parseFingering,
  planFingering,
  playabilityWarnings,
  prefersFlats,
  soundingNotes,
} from "@/lib/music";
import { DEFAULT_OPTIONS, type DiagramOptions, type DotLabel, THEMES } from "@/lib/diagram";
import { type Accidental, type StaffNote, type StaffOptions, chordSpelling } from "@/lib/staff";
import { formatNotes, parseNotes } from "@/lib/notation";
import type { ExportLayout } from "@/lib/compose";
import type { Tuning } from "@/lib/music";
import { STANDARD, formatTuningParam, isStandard, parseTuningParam } from "@/lib/tuning";

export type Tab = "grips" | "notation" | "chord" | "integration";
export type Spelling = "auto" | "sharps" | "flats";

const TABS: Tab[] = ["grips", "notation", "chord", "integration"];

/**
 * All app state, shared by the three tabs so a chord built in one shows up in the others.
 */
export function useChordStore() {
  const searchParams = useSearchParams();
  const loaded = useRef(false);
  const [tab, setTab] = useState<Tab>("grips");

  // ---- Grip ----
  const [frets, setFrets] = useState<Fingering>(parseFingering("x32010")!);
  const [fingerText, setFingerText] = useState("x32010");
  const [manualFingers, setManualFingers] = useState<Fingers | null>(null);

  // ---- Naming ----
  const [title, setTitle] = useState("");
  const [titleAuto, setTitleAuto] = useState(true);
  // True while the title came from a chord picked in the chord finder; editing the grip
  // by hand then switches back to the detected name so the title can't go stale.
  const [titleFromFinder, setTitleFromFinder] = useState(false);
  // Spelling of the chord picked by name (E7#5 → B#), used while titleFromFinder holds.
  const [finderPcNames, setFinderPcNames] = useState<string[] | null>(null);

  // ---- Tuning: shared by all four tabs, standard by default ----
  const [tuning, setTuning] = useState<Tuning>(STANDARD);

  // ---- Chord finder ----
  const [chordSearch, setChordSearch] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  // ---- Display ----
  const [minRows, setMinRows] = useState(4);
  const [dotLabel, setDotLabel] = useState<DotLabel>("finger");
  const [bottomLabel, setBottomLabel] = useState<DotLabel>("none");
  const [drawBarre, setDrawBarre] = useState(true);
  const [highlightRoot, setHighlightRoot] = useState(false);
  const [inlays, setInlays] = useState(true);
  const [leftHanded, setLeftHanded] = useState(false);
  const [themeKey, setThemeKey] = useState("classic");
  const [spelling, setSpelling] = useState<Spelling>("auto");

  // ---- Export ----
  const [scale, setScale] = useState(3);
  const [combinedLayout, setCombinedLayout] = useState<ExportLayout>("side");

  // ---- Notation ----
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [accidental, setAccidental] = useState<Accidental>("");

  // ---- URL: load once, then keep in sync so any state can be bookmarked ----
  useEffect(() => {
    // Read through Next's router: after a link inside the site, window.location may not have
    // caught up yet when this runs.
    const params = new URLSearchParams(searchParams.toString());
    loaded.current = true;
    const parsed = parseFingering(params.get("f") ?? "");
    if (parsed) {
      setFrets(parsed);
      setFingerText(formatFingering(parsed));
    }
    const t = params.get("t");
    if (t) {
      setTitle(t);
      setTitleAuto(false);
    }
    const tune = parseTuningParam(params.get("tune") ?? "");
    if (tune) setTuning(tune);
    const c = params.get("c");
    if (c) setChordSearch(c);
    const v = params.get("v") as Tab | null;
    if (v && TABS.includes(v)) setTab(v);
    const nn = parseNotes(params.get("n") ?? "");
    if (nn && nn.length) {
      setNotes(nn);
      setNoteText(formatNotes(nn));
    }
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const params = new URLSearchParams();
    if (tab !== "grips") params.set("v", tab);
    params.set("f", formatFingering(frets));
    if (!titleAuto && title) params.set("t", title);
    if (notes.length) params.set("n", formatNotes(notes));
    if (chordSearch.trim()) params.set("c", chordSearch.trim());
    if (!isStandard(tuning)) params.set("tune", formatTuningParam(tuning));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [tab, frets, title, titleAuto, notes, chordSearch, tuning]);

  // ---- Derived ----
  const matches = useMemo(() => identifyChord(frets, tuning), [frets, tuning]);
  const match = matches[Math.min(matchIndex, Math.max(matches.length - 1, 0))] ?? null;
  const plan = useMemo(() => planFingering(frets), [frets]);
  const detectedBarre = plan.barre;
  const barre = drawBarre ? detectedBarre : null;
  const fingers = manualFingers ?? plan.fingers;
  const warnings = useMemo(() => playabilityWarnings(frets, plan, tuning), [frets, plan, tuning]);
  const effectiveTitle = titleAuto ? (match?.name ?? "") : title;
  const preferFlats = spelling === "flats" || (spelling === "auto" && prefersFlats(match?.root ?? null));
  const window_ = fretWindow(frets, minRows);
  // Auto spelling follows the chord (C minor → E♭, E major → G♯).
  const rootName = match ? (/^[A-G][#b]?/.exec(match.name)?.[0] ?? null) : null;
  const pcNames =
    spelling === "auto" && titleFromFinder && finderPcNames
      ? finderPcNames
      : spelling === "auto" && match && rootName
        ? chordSpelling(match.root, rootName, match.suffix, preferFlats)
        : undefined;

  // If the grip plays exactly the written notes, keep the user's spelling on the staff.
  const gripMidis = soundingNotes(frets, tuning).map((n) => n.midi);
  const sameAsNotation =
    notes.length > 0 &&
    new Set(gripMidis).size === new Set(notes.map((n) => n.midi)).size &&
    notes.every((n) => gripMidis.includes(n.midi));

  const diagramOptions: DiagramOptions = {
    ...DEFAULT_OPTIONS,
    title: effectiveTitle,
    minRows,
    dotLabel,
    bottomLabel,
    barre,
    leftHanded,
    highlightRoot,
    inlays,
    root: match?.root ?? null,
    preferFlats,
    pcNames,
    colors: THEMES[themeKey],
    tuning,
  };
  const staffOptions: StaffOptions = {
    preferFlats,
    root: match?.root ?? null,
    highlightRoot,
    colors: THEMES[themeKey],
    tuning,
    pcNames,
    notes: sameAsNotation ? notes : undefined,
  };

  // ---- Actions ----
  const updateFrets = (next: Fingering, chordName?: string, chordPcNames?: string[]) => {
    setFrets(next);
    setFingerText(formatFingering(next));
    setManualFingers(null);
    setMatchIndex(0);
    if (chordName) {
      setTitle(chordName);
      setTitleAuto(false);
      setTitleFromFinder(true);
      setFinderPcNames(chordPcNames ?? null);
    } else if (titleFromFinder) {
      setTitleAuto(true);
      setTitleFromFinder(false);
    }
  };

  const onFingerTextChange = (text: string) => {
    setFingerText(text);
    const parsed = parseFingering(text);
    if (parsed) {
      setFrets(parsed);
      setManualFingers(null);
      setMatchIndex(0);
      if (titleFromFinder) {
        setTitleAuto(true);
        setTitleFromFinder(false);
      }
    }
  };

  const setFinger = (s: number, finger: Finger | null) => {
    const next = [...fingers];
    next[s] = finger;
    setManualFingers(next);
  };

  const updateNotes = (next: StaffNote[]) => {
    setNotes(next);
    setNoteText(formatNotes(next));
  };

  const onNoteTextChange = (text: string) => {
    setNoteText(text);
    const parsed = parseNotes(text);
    if (parsed) setNotes(parsed);
  };

  return {
    tab,
    setTab,
    frets,
    fingerText,
    manualFingers,
    setManualFingers,
    clearFingers: () => setManualFingers(emptyFingers()),
    fingers,
    title,
    setTitle: (t: string) => {
      setTitle(t);
      setTitleFromFinder(false);
    },
    chordSearch,
    setChordSearch,
    tuning,
    setTuning,
    titleAuto,
    setTitleAuto,
    matchIndex,
    setMatchIndex,
    matches,
    match,
    detectedBarre,
    warnings,
    effectiveTitle,
    preferFlats,
    pcNames,
    fretWindow: window_,
    minRows,
    setMinRows,
    dotLabel,
    setDotLabel,
    bottomLabel,
    setBottomLabel,
    drawBarre,
    setDrawBarre,
    highlightRoot,
    setHighlightRoot,
    inlays,
    setInlays,
    leftHanded,
    setLeftHanded,
    themeKey,
    setThemeKey,
    spelling,
    setSpelling,
    scale,
    setScale,
    combinedLayout,
    setCombinedLayout,
    notes,
    noteText,
    accidental,
    setAccidental,
    diagramOptions,
    staffOptions,
    updateFrets,
    onFingerTextChange,
    setFinger,
    updateNotes,
    onNoteTextChange,
  };
}

export type ChordStore = ReturnType<typeof useChordStore>;
