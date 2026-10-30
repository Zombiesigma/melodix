
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Song } from "@/types/song";

/* =========================================================
   TYPES
========================================================= */

type ChordPosition = {
  chord: string;
  position: number;
};

type ParsedLine =
  | {
      type: "section";
      title: string;
    }
  | {
      type: "line";
      lyrics: string;
      chords: ChordPosition[];
    };

type LyricSegment = {
  chord: string;
  text: string;
  position: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  Fb: "E",
  "E#": "F",
  "B#": "C",
};

const SECTION_NAMES = new Set([
  "intro",
  "verse",
  "verse 1",
  "verse 2",
  "verse 3",
  "verse 4",
  "pre-chorus",
  "pre chorus",
  "chorus",
  "chorus 1",
  "chorus 2",
  "chorus 3",
  "bridge",
  "music",
  "instrumental",
  "solo",
  "outro",
  "interlude",
  "refrain",
  "ending",
  "post-chorus",
  "post chorus",
]);

const SCROLL_SPEEDS: Record<number, number> = {
  1: 8,
  2: 16,
  3: 26,
  4: 40,
  5: 60,
};

const MIN_FONT_SIZE = 13;
const MAX_FONT_SIZE = 28;
const DEFAULT_FONT_SIZE = 16;

/* =========================================================
   CHORD UTILITIES
========================================================= */

function isSectionName(value: string): boolean {
  return SECTION_NAMES.has(value.trim().toLowerCase());
}

function normalizeRoot(root: string): string {
  return FLAT_TO_SHARP[root] ?? root;
}

function isValidRoot(root: string): boolean {
  return /^(?:[A-G](?:#|b)?)$/.test(root);
}

/**
 * Accepts common chord formats:
 * C, Am, F#m7, Cmaj7, Dsus4, Cadd9, C/E, Bb/D.
 *
 * This is intentionally a practical chord parser rather than
 * a complete music-theory grammar.
 */
function isChord(value: string): boolean {
  const chord = value.trim();

  if (!chord || isSectionName(chord)) return false;

  const match = chord.match(
    /^([A-G](?:#|b)?)(?:(?:m|min|maj|M|dim|aug|sus|add|no|ø|°)?(?:\d{0,2})?(?:\([#b+\-]?\d+\))?(?:[#b+\-]\d+)?)*(?:\/([A-G](?:#|b)?))?$/
  );

  if (!match) return false;

  return !match[2] || isValidRoot(match[2]);
}

function transposeNote(note: string, amount: number): string {
  const normalized = normalizeRoot(note);
  const index = NOTES.indexOf(normalized as (typeof NOTES)[number]);

  if (index < 0) return note;

  const nextIndex = ((index + amount) % 12 + 12) % 12;

  return NOTES[nextIndex];
}

function transposeChord(chord: string, amount: number): string {
  if (!amount) return chord;

  const match = chord.match(
    /^([A-G](?:#|b)?)(.*)$/
  );

  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  // Transpose the bass note of slash chords as well.
  const slashMatch = suffix.match(
    /^(.*)\/([A-G](?:#|b)?)$/
  );

  if (slashMatch) {
    const [, quality, bass] = slashMatch;

    return (
      transposeNote(root, amount) +
      quality +
      "/" +
      transposeNote(bass, amount)
    );
  }

  return transposeNote(root, amount) + suffix;
}

function transposeLyrics(text: string, amount: number): string {
  if (!amount) return text;

  return text.replace(/\[([^\]]+)\]/g, (full, content: string) => {
    const chord = content.trim();

    if (!isChord(chord)) return full;

    return `[${transposeChord(chord, amount)}]`;
  });
}

/* =========================================================
   SECTION PARSER
========================================================= */

function parseChordLyrics(text: string): ParsedLine[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const result: ParsedLine[] = [];

  for (const rawLine of normalized.split("\n")) {
    if (rawLine.trim() === "") {
      result.push({
        type: "line",
        lyrics: "",
        chords: [],
      });

      continue;
    }

    // A standalone bracketed label is a section only when
    // it is a recognized section name.
    const sectionMatch = rawLine.match(/^\s*\[([^\]]+)\]\s*$/);

    if (sectionMatch && isSectionName(sectionMatch[1])) {
      result.push({
        type: "section",
        title: sectionMatch[1].trim(),
      });

      continue;
    }

    let lyrics = "";
    let cursor = 0;

    const chords: ChordPosition[] = [];

    while (cursor < rawLine.length) {
      if (rawLine[cursor] === "[") {
        const close = rawLine.indexOf("]", cursor + 1);

        if (close !== -1) {
          const content = rawLine.slice(cursor + 1, close).trim();

          if (isChord(content)) {
            chords.push({
              chord: content,
              position: lyrics.length,
            });

            cursor = close + 1;
            continue;
          }
        }
      }

      lyrics += rawLine[cursor];
      cursor++;
    }

    result.push({
      type: "line",
      lyrics,
      chords,
    });
  }

  return result;
}

/* =========================================================
   CHORD PROGRESSION
========================================================= */

function ChordProgression({
  chords,
}: {
  chords: ChordPosition[];
}) {
  if (!chords.length) return null;

  return (
    <div className="flex max-w-full flex-wrap gap-2">
      {chords.map((item, index) => (
        <span
          key={`${item.chord}-${index}`}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#FFC400]/20 bg-[#FFC400]/[0.055] px-3 font-mono text-sm font-bold text-[#FFC400]"
        >
          {item.chord}
        </span>
      ))}
    </div>
  );
}

/* =========================================================
   CHORD + LYRIC LINE
========================================================= */

function buildSegments(
  lyrics: string,
  chords: ChordPosition[]
): LyricSegment[] {
  const sorted = [...chords].sort(
    (a, b) => a.position - b.position
  );

  if (!sorted.length) {
    return [
      {
        chord: "",
        text: lyrics,
        position: 0,
      },
    ];
  }

  const segments: LyricSegment[] = [];

  // Preserve the lyric text before the first chord.
  if (sorted[0].position > 0) {
    segments.push({
      chord: "",
      text: lyrics.slice(0, sorted[0].position),
      position: 0,
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const start = Math.max(
      0,
      Math.min(current.position, lyrics.length)
    );

    const end = next
      ? Math.max(start, Math.min(next.position, lyrics.length))
      : lyrics.length;

    segments.push({
      chord: current.chord,
      text: lyrics.slice(start, end),
      position: start,
    });
  }

  return segments;
}

function ChordLyricLine({
  chords,
  lyrics,
  onSelectChord,
}: {
  chords: ChordPosition[];
  lyrics: string;
  onSelectChord?: (chord: string) => void;
}) {
  if (!chords.length) {
    return (
      <div className="w-full whitespace-pre-wrap break-words font-mono leading-[1.8] text-[#A1A1AA]">
        {lyrics || "\u00A0"}
      </div>
    );
  }

  const segments = buildSegments(lyrics, chords);

  return (
    <div className="w-full font-mono leading-[1.8]">
      <div className="flex max-w-full flex-wrap items-end">
        {segments.map((segment, index) => (
          <span
            key={`${segment.position}-${segment.chord}-${index}`}
            className="relative inline-flex min-w-0 max-w-full flex-col align-bottom"
          >
            {segment.chord ? (
              <button
                type="button"
                onClick={() => onSelectChord?.(segment.chord)}
                title={`Lihat diagram ${segment.chord}`}
                className="mb-0.5 block w-fit whitespace-nowrap font-mono text-[0.85em] font-bold leading-[1.3] text-[#FFC400] hover:text-[#E5AD00] focus-visible:outline-none focus-visible:underline"
              >
                {segment.chord}
              </button>
            ) : (
              <span
                aria-hidden="true"
                className="mb-0.5 block select-none text-[0.85em] leading-[1.3] text-transparent"
              >
                {"\u00A0"}
              </span>
            )}

            <span className="min-w-0 whitespace-pre-wrap break-words text-[#A1A1AA]">
              {segment.text || "\u00A0"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 mt-10 first:mt-0">
      <span className="inline-flex max-w-full items-center rounded-xl border border-[#FFC400]/20 bg-[#FFC400]/[0.055] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#FFC400]">
        {title}
      </span>
    </div>
  );
}

/* =========================================================
   CHORD LIST
========================================================= */

const OPEN_CHORD_SHAPES: Record<string, { frets: number[]; fingers: number[]; label: string }> = {
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], label: "x32010" },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], label: "xx0232" },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], label: "022100" },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], label: "320003" },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], label: "x02220" },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], label: "x02210" },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], label: "xx0231" },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], label: "022000" },
  F: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], label: "133211" },
  Bm: { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], label: "x24432" },
};

function ChordDiagram({ chord, onClose }: { chord: string; onClose: () => void }) {
  const rootChord = chord.replace(/\/.*$/, "");
  const shape = OPEN_CHORD_SHAPES[rootChord];
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={`Chord diagram ${chord}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-3xl border border-[#333333] bg-[#101010] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#737373]">Chord diagram</p><h2 className="mt-1 text-3xl font-black text-[#FFC400]">{chord}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl border border-[#333333] px-3 py-2 text-[#A1A1AA] hover:bg-[#202020]" aria-label="Close chord diagram">✕</button>
        </div>
        {shape ? (
          <div className="mt-5">
            <svg viewBox="0 0 240 190" role="img" aria-label={`${chord} guitar chord shape`} className="mx-auto w-full max-w-[260px]">
              {[0,1,2,3,4,5].map((string) => <line key={`s${string}`} x1={42 + string * 31} y1="36" x2={42 + string * 31} y2="156" stroke="#a1a1aa" strokeWidth={string === 0 || string === 5 ? 1.8 : 1.2} />)}
              {[0,1,2,3,4].map((fret) => <line key={`f${fret}`} x1="42" y1={36 + fret * 30} x2="197" y2={36 + fret * 30} stroke={fret === 0 ? "#e4e4e7" : "#52525b"} strokeWidth={fret === 0 ? 4 : 1.2} />)}
              {shape.frets.map((fret, i) => <g key={`dot${i}`}>
                {fret < 0 ? <text x={42 + i * 31} y="23" textAnchor="middle" fontSize="17" fill="#fbbf24">×</text> : fret === 0 ? <circle cx={42 + i * 31} cy="20" r="6" fill="none" stroke="#fbbf24" strokeWidth="2" /> : <circle cx={42 + i * 31} cy={36 + (fret - 0.5) * 30} r="8" fill="#fbbf24" />}
              </g>)}
            </svg>
            <p className="mt-2 text-center font-mono text-sm tracking-[.25em] text-[#A1A1AA]">{shape.label}</p>
            <p className="mt-3 text-center text-xs text-[#737373]">Diagram chord dasar. Untuk variasi/barre chord, cek fingering sesuai versi lagu.</p>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-[#202020] bg-[#171717] p-5"><p className="font-medium text-[#A1A1AA]">Bentuk chord ini belum tersedia sebagai diagram otomatis.</p><p className="mt-2 text-sm text-[#737373]">Coba chord dasar seperti C, D, E, G, A, Am, Dm, Em, F, atau Bm.</p></div>
        )}
      </div>
    </div>
  );
}

function ChordList({ chords, onSelect }: { chords: string[]; onSelect: (chord: string) => void }) {
  if (!chords.length) return null;
  return (
    <section className="mb-8 border-b border-[#202020] pb-7">
      <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373]">Chords</p><p className="mt-1 text-xs text-[#7B817F]">{chords.length} {chords.length === 1 ? "chord" : "chords"} · tap chord untuk lihat diagram</p></div>
      <div className="flex max-w-full flex-wrap gap-2">{chords.map((chord, index) => <button type="button" key={`${chord}-${index}`} onClick={() => onSelect(chord)} className="rounded-xl border border-[#FFC400]/20 bg-[#171717] px-3.5 py-2 font-mono text-sm font-bold text-[#FFC400] transition hover:border-[#FFC400]/60 hover:bg-[#FFC400]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400]">{chord}</button>)}</div>
    </section>
  );
}

/* =========================================================
   MAIN SONG VIEWER
========================================================= */

export default function SongViewer({ song }: { song: Song }) {
  const [shift, setShift] = useState(0);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showPracticeController, setShowPracticeController] = useState(true);
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [capoOffset, setCapoOffset] = useState<number>(Number(song.capo ?? 0));
  const [metronomeOn, setMetronomeOn] = useState(false);
  const [beat, setBeat] = useState(0);
  const [bpm, setBpm] = useState<number>(Number(song.bpm ?? 90) || 90);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setCapoOffset(Number(song.capo ?? 0));
    setBpm(Number(song.bpm ?? 90) || 90);
    setShift(0);
    setSelectedChord(null);
    setMetronomeOn(false);
  }, [song.title, song.capo, song.bpm]);

  const rawLyrics = song.lyricsWithChords || "";

  /* -------------------------------------------------------
     PARSE SOURCE LYRICS FIRST
     Prevents the chord summary from being transposed twice.
  ------------------------------------------------------- */

  const originalLines = useMemo(
    () => parseChordLyrics(rawLyrics),
    [rawLyrics]
  );

  const transposedLyrics = useMemo(
    () => transposeLyrics(rawLyrics, shift),
    [rawLyrics, shift]
  );

  const parsedLines = useMemo(
    () => parseChordLyrics(transposedLyrics),
    [transposedLyrics]
  );

  /* -------------------------------------------------------
     CHORD SUMMARY
  ------------------------------------------------------- */

  const displayedChords = useMemo(() => {
    const result: string[] = [];

    const sourceChords = Array.isArray(song.uniqueChords)
      ? song.uniqueChords
      : [];

    const detectedChords: string[] = [];

    for (const line of originalLines) {
      if (line.type !== "line") continue;

      for (const item of line.chords) {
        if (!detectedChords.includes(item.chord)) {
          detectedChords.push(item.chord);
        }
      }
    }

    for (const value of [...sourceChords, ...detectedChords]) {
      const chord = String(value ?? "").trim();

      if (!isChord(chord)) continue;

      const transposed = transposeChord(chord, shift);

      if (!result.includes(transposed)) {
        result.push(transposed);
      }
    }

    return result;
  }, [song.uniqueChords, originalLines, shift]);

  const displayedKey = useMemo(() => {
    if (!song.originalKey) return null;

    return transposeChord(song.originalKey, shift);
  }, [song.originalKey, shift]);

  /* -------------------------------------------------------
     SCROLL CONTROLS
  ------------------------------------------------------- */

  const stopAutoScroll = useCallback(() => {
    setAutoScroll(false);
    lastTimeRef.current = null;

    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!autoScroll) {
      lastTimeRef.current = null;
      return;
    }

    let cancelled = false;

    const pixelsPerSecond = SCROLL_SPEEDS[scrollSpeed] ?? 16;

    const tick = (timestamp: number) => {
      if (cancelled) return;

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      // Avoid large jumps after the browser tab resumes.
      const delta = Math.min(
        timestamp - lastTimeRef.current,
        50
      );

      lastTimeRef.current = timestamp;

      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );

      const remaining = maxScroll - window.scrollY;

      if (remaining <= 1) {
        animationRef.current = null;
        lastTimeRef.current = null;
        setAutoScroll(false);
        return;
      }

      window.scrollBy({
        top: Math.min(
          (pixelsPerSecond * delta) / 1000,
          remaining
        ),
        behavior: "instant",
      });

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      lastTimeRef.current = null;
    };
  }, [autoScroll, scrollSpeed]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        lastTimeRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  // Keep the floating practice dock in sync with the reader's position.
  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress(scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0);
      });
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const seekScroll = useCallback((value: number) => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: (Math.max(0, Math.min(100, value)) / 100) * Math.max(0, scrollable), behavior: "auto" });
    setScrollProgress(value);
  }, []);

  useEffect(() => {
    if (!metronomeOn) { setBeat(0); return; }
    let timer: ReturnType<typeof setInterval> | undefined;
    let audioContext: AudioContext | null = null;
    let currentBeat = 0;
    try { audioContext = new window.AudioContext(); } catch { setMetronomeOn(false); return; }
    const click = () => {
      if (!audioContext) return;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = currentBeat % 4 === 0 ? 1200 : 800;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.07);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.08);
      currentBeat = (currentBeat + 1) % 4; setBeat(currentBeat === 0 ? 4 : currentBeat);
    };
    click(); timer = setInterval(click, 60000 / Math.max(30, Math.min(240, bpm)));
    return () => { if (timer) clearInterval(timer); void audioContext?.close(); };
  }, [metronomeOn, bpm]);

  const resetScroll = useCallback(() => {
    stopAutoScroll();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [stopAutoScroll]);

  /* -------------------------------------------------------
     FONT CONTROLS
  ------------------------------------------------------- */

  const decreaseFont = useCallback(() => {
    setFontSize((current) =>
      Math.max(MIN_FONT_SIZE, current - 1)
    );
  }, []);

  const increaseFont = useCallback(() => {
    setFontSize((current) =>
      Math.min(MAX_FONT_SIZE, current + 1)
    );
  }, []);

  const resetTranspose = useCallback(() => {
    setShift(0);
  }, []);

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <main className="min-h-screen w-full overflow-x-clip bg-[#050505] text-[#F5F5F5]">
      {/* STICKY NAVIGATION */}

      <header className="sticky top-0 z-50 w-full border-b border-[#202020]/80 bg-[#050505]/95 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/songs"
            className="shrink-0 rounded-lg py-2 text-sm font-medium text-[#A1A1AA] transition hover:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400]"
          >
            ← Songs
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* TRANSPOSE */}

            <div
              className="flex items-center gap-1 rounded-xl border border-[#202020] bg-[#111111] p-1"
              aria-label="Transpose controls"
            >
              <button
                type="button"
                onClick={() => setShift((value) => Math.max(-12, value - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-[#A1A1AA] transition hover:bg-[#202020] hover:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] active:scale-95"
                aria-label="Transpose down one semitone"
              >
                −
              </button>

              <button
                type="button"
                onClick={resetTranspose}
                className="flex min-w-10 items-center justify-center rounded-lg px-1 font-mono text-xs font-bold text-[#A1A1AA] transition hover:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400]"
                title="Reset transpose"
                aria-label={`Transpose ${shift} semitones. Reset`}
              >
                {shift > 0 ? `+${shift}` : shift}
              </button>

              <button
                type="button"
                onClick={() => setShift((value) => Math.min(12, value + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-[#A1A1AA] transition hover:bg-[#202020] hover:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] active:scale-95"
                aria-label="Transpose up one semitone"
              >
                +
              </button>
            </div>

            {/* FONT SIZE */}

            <div
              className="flex items-center gap-1 rounded-xl border border-[#202020] bg-[#111111] p-1"
              aria-label="Font size controls"
            >
              <button
                type="button"
                onClick={decreaseFont}
                disabled={fontSize <= MIN_FONT_SIZE}
                className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-[#A1A1AA] transition hover:bg-[#202020] hover:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Decrease text size"
              >
                A−
              </button>

              <span
                className="flex min-w-7 justify-center font-mono text-xs font-bold text-[#737373]"
                aria-live="polite"
                aria-label={`Font size ${fontSize} pixels`}
              >
                {fontSize}
              </span>

              <button
                type="button"
                onClick={increaseFont}
                disabled={fontSize >= MAX_FONT_SIZE}
                className="flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold text-[#A1A1AA] transition hover:bg-[#202020] hover:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Increase text size"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* SONG INFORMATION */}

      <section className="mx-auto max-w-5xl px-4 pb-9 pt-8 sm:pb-10 sm:pt-12">
        <div className="grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-end">
          <div className="mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-[26px] bg-[#202020] shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:mx-0 sm:max-w-none">
            {song.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.coverImageUrl}
                alt={`${song.title} cover`}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-bold tracking-[0.2em] text-[#7B817F]">
                NO COVER
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#737373]">
              {song.genre || "Song"}
            </p>

            <h1 className="mt-2 break-words text-4xl font-black tracking-[-0.045em] text-[#F5F5F5] sm:text-6xl">
              {song.title}
            </h1>

            <p className="mt-2 break-words text-lg font-medium text-[#A1A1AA]">
              {song.artist || "Unknown artist"}
            </p>

            <div className="mt-5 flex max-w-full flex-wrap gap-2">
              {displayedKey && (
                <span className="rounded-full bg-[#202020] px-3 py-2 text-xs text-[#A1A1AA]">
                  Key {displayedKey}
                </span>
              )}

              <label className="flex items-center gap-2 rounded-full bg-[#202020] px-3 py-2 text-xs text-[#A1A1AA]">Capo <select value={capoOffset} onChange={(event) => setCapoOffset(Number(event.target.value))} className="bg-transparent font-bold text-[#A1A1AA] outline-none" aria-label="Capo position" title="Atur posisi capo untuk sesi latihan ini">{Array.from({ length: 13 }, (_, index) => <option key={index} value={index} className="bg-[#202020]">{index}</option>)}</select></label>

              {song.bpm ? (
                <span className="rounded-full bg-[#202020] px-3 py-2 text-xs text-[#A1A1AA]">
                  {song.bpm} BPM
                </span>
              ) : null}

              {song.tuning ? (
                <span className="max-w-full break-words rounded-full bg-[#202020] px-3 py-2 text-xs text-[#A1A1AA]">
                  {song.tuning}
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {song.youtubeUrl ? (
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] active:scale-95"
                >
                  YouTube ↗
                </a>
              ) : null}

              {song.spotifyTrackUrl ? (
                <a
                  href={song.spotifyTrackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-[#202020] bg-[#111111] px-4 py-2.5 text-sm font-bold text-[#A1A1AA] transition hover:border-[#FFC400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] active:scale-95"
                >
                  Spotify ↗
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* CHORD SUMMARY */}

      <section className="mx-auto max-w-5xl px-4 pb-2">
        <ChordList chords={displayedChords} onSelect={setSelectedChord} />
      </section>

      {/* METRONOME */}
      <section className="mx-auto max-w-5xl px-4 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#202020] bg-[#171717] p-4 sm:p-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373]">Metronome</p><p className="mt-1 text-sm text-[#A1A1AA]">Practice tempo · {bpm} BPM</p></div>
          <div className="flex items-center gap-3"><button type="button" onClick={() => setBpm((value) => Math.max(30, value - 1))} className="h-9 w-9 rounded-lg border border-[#333333] text-lg hover:bg-[#202020]" aria-label="Decrease BPM">−</button><input type="range" min="30" max="240" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} className="w-28 accent-[#FFC400] sm:w-40" aria-label="Metronome BPM"/><button type="button" onClick={() => setBpm((value) => Math.min(240, value + 1))} className="h-9 w-9 rounded-lg border border-[#333333] text-lg hover:bg-[#202020]" aria-label="Increase BPM">+</button><button type="button" onClick={() => setMetronomeOn((value) => !value)} aria-pressed={metronomeOn} className={`rounded-xl px-4 py-2 text-sm font-bold ${metronomeOn ? "bg-[#FFC400] text-black" : "border border-[#333333] bg-[#111111] text-[#A1A1AA]"}`}>{metronomeOn ? "Ⅱ Stop" : "▶ Start"}</button></div>
          <div className="flex w-full justify-center gap-2" aria-label={`Beat ${beat}`}><span className={`h-2.5 w-2.5 rounded-full ${beat === 1 ? "bg-[#FFC400]" : "bg-[#333333]"}`} /><span className={`h-2.5 w-2.5 rounded-full ${beat === 2 ? "bg-[#FFC400]" : "bg-[#333333]"}`} /><span className={`h-2.5 w-2.5 rounded-full ${beat === 3 ? "bg-[#FFC400]" : "bg-[#333333]"}`} /><span className={`h-2.5 w-2.5 rounded-full ${beat === 4 ? "bg-[#FFC400]" : "bg-[#333333]"}`} /></div>
        </div>
      </section>

      {/* LYRICS */}

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div
          className="w-full min-w-0 px-1 py-4 pb-36 sm:px-4 sm:py-6 sm:pb-40"
          style={{ fontSize: `${fontSize}px` }}
        >
          {parsedLines.map((line, index) => {
            if (line.type === "section") {
              return (
                <SectionHeader
                  key={`section-${index}`}
                  title={line.title}
                />
              );
            }

            if (line.lyrics.trim() === "" && line.chords.length > 0) {
              return (
                <div
                  key={`progression-${index}`}
                  className="mb-8 max-w-full"
                >
                  <ChordProgression chords={line.chords} />
                </div>
              );
            }

            if (line.lyrics === "" && line.chords.length === 0) {
              return (
                <div
                  key={`empty-${index}`}
                  className="h-5"
                  aria-hidden="true"
                />
              );
            }

            return (
              <div
                key={`line-${index}`}
                className="mb-4 w-full min-w-0"
              >
                <ChordLyricLine
                  chords={line.chords}
                  lyrics={line.lyrics}
                  onSelectChord={setSelectedChord}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* FIXED BOTTOM PRACTICE CONTROLLER — cream/blue app theme */}
      {showPracticeController ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[80] border-t border-[#292929] bg-[#050505]/[0.97] text-[#F5F5F5] shadow-[0_-10px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
          role="region"
          aria-label="Floating song practice controls"
        >
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
            <button type="button" onClick={() => { stopAutoScroll(); setShowPracticeController(false); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#292929] bg-[#202020] text-2xl text-[#A1A1AA] transition hover:border-[#FFC400]/40 hover:bg-[#2A2A2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400]" aria-label="Sembunyikan kontrol auto-scroll" title="Sembunyikan kontrol">×</button>
            <div className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#FFC400]/15 bg-[#241D08] px-2 text-[#E5AD00] sm:max-w-[320px] sm:gap-5 sm:px-4">
              <button type="button" onClick={() => setScrollSpeed((value) => Math.max(1, value - 1))} disabled={scrollSpeed <= 1} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-2xl font-medium transition hover:bg-white/70 disabled:opacity-30" aria-label="Perlambat auto-scroll">−</button>
              <div className="min-w-[58px] text-center"><span className="block font-mono text-base font-bold tabular-nums" aria-live="polite">{({ 1: "0.5x", 2: "1.0x", 3: "1.6x", 4: "2.5x", 5: "3.8x" } as Record<number, string>)[scrollSpeed]}</span><span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#5D7898]">Speed</span></div>
              <button type="button" onClick={() => setScrollSpeed((value) => Math.min(5, value + 1))} disabled={scrollSpeed >= 5} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-2xl font-medium transition hover:bg-white/70 disabled:opacity-30" aria-label="Percepat auto-scroll">+</button>
            </div>
            <button type="button" onClick={() => setAutoScroll((value) => !value)} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-black shadow-md shadow-[#FFC400]/20 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] ${autoScroll ? "bg-[#D49F00] hover:bg-[#B88900]" : "bg-[#FFC400] hover:bg-[#E5AD00]"}`} aria-pressed={autoScroll} aria-label={autoScroll ? "Pause auto-scroll" : "Mulai auto-scroll"} title={autoScroll ? "Pause" : "Play"}>{autoScroll ? "Ⅱ" : "▶"}</button>
          </div>
          <div className="h-1 w-full bg-[#202020]" aria-label={`Posisi lagu ${Math.round(scrollProgress)} persen`}><div className="h-full bg-[#FFC400] transition-[width] duration-100" style={{ width: `${scrollProgress}%` }} /></div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowPracticeController(true)} className="fixed bottom-4 right-4 z-[80] flex h-12 items-center gap-2 rounded-2xl border border-white/20 bg-[#FFC400] px-5 text-sm font-bold text-black shadow-lg shadow-[#FFC400]/20 transition hover:bg-[#E5AD00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400]" style={{ marginBottom: "env(safe-area-inset-bottom)" }}><span>{autoScroll ? "Ⅱ" : "▶"}</span> Kontrol scroll</button>
      )}

      {/* FOOTER */}

      <footer className="mx-auto max-w-5xl px-4 pb-28 text-center text-xs text-[#7B817F]">
        {song.title}
        {song.artist ? ` · ${song.artist}` : ""}
      </footer>
      {selectedChord ? <ChordDiagram chord={selectedChord} onClose={() => setSelectedChord(null)} /> : null}
    </main>
  );
}
