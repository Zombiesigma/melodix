"use client";

import Link from "next/link";
import {
  Share2,
  Check,
  Play,
  Pause,
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  Keyboard,
  X,
  ChevronUp,
  ArrowLeft,
  Youtube,
  Music2,
  Volume2,
  Sparkles,
  CircleDot,
} from "lucide-react";
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

type ChordPosition = { chord: string; position: number };

type ParsedLine =
  | { type: "section"; title: string }
  | { type: "line"; lyrics: string; chords: ChordPosition[] };

type ChordShape = {
  frets: number[];
  fingers: number[];
  barre?: { fret: number; from: number; to: number };
  label: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const NOTES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
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
  "intro", "verse", "verse 1", "verse 2", "verse 3", "verse 4",
  "pre-chorus", "pre chorus", "chorus", "chorus 1", "chorus 2",
  "chorus 3", "bridge", "music", "instrumental", "solo", "outro",
  "interlude", "refrain", "ending", "post-chorus", "post chorus",
]);

const SCROLL_SPEEDS: Record<number, number> = {
  1: 8, 2: 16, 3: 26, 4: 40, 5: 60,
};

const SPEED_LABELS: Record<number, string> = {
  1: "0.5x", 2: "1.0x", 3: "1.6x", 4: "2.5x", 5: "3.8x",
};

const MIN_FONT_SIZE = 13;
const MAX_FONT_SIZE = 28;
const DEFAULT_FONT_SIZE = 14;

/* =========================================================
   CHORD UTILITIES
========================================================= */

function isSectionName(v: string) {
  return SECTION_NAMES.has(v.trim().toLowerCase());
}

function normalizeRoot(r: string) {
  return FLAT_TO_SHARP[r] ?? r;
}

function isValidRoot(r: string) {
  return /^(?:[A-G](?:#|b)?)$/.test(r);
}

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
  return NOTES[((index + amount) % 12 + 12) % 12];
}

function transposeChord(chord: string, amount: number): string {
  if (!amount) return chord;
  const match = chord.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) return chord;
  const root = match[1];
  const suffix = match[2];
  const slashMatch = suffix.match(/^(.*)\/([A-G](?:#|b)?)$/);
  if (slashMatch) {
    const [, quality, bass] = slashMatch;
    return (
      transposeNote(root, amount) + quality + "/" +
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
   PARSER
========================================================= */

function parseChordLyrics(text: string): ParsedLine[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const result: ParsedLine[] = [];

  for (const rawLine of normalized.split("\n")) {
    if (rawLine.trim() === "") {
      result.push({ type: "line", lyrics: "", chords: [] });
      continue;
    }
    const sectionMatch = rawLine.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sectionMatch && isSectionName(sectionMatch[1])) {
      result.push({ type: "section", title: sectionMatch[1].trim() });
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
            chords.push({ chord: content, position: lyrics.length });
            cursor = close + 1;
            continue;
          }
        }
      }
      lyrics += rawLine[cursor];
      cursor++;
    }
    result.push({ type: "line", lyrics, chords });
  }
  return result;
}

/* =========================================================
   CHORD + LYRIC LINE (Ruby Annotation)
========================================================= */

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
      <div className="w-full whitespace-pre-wrap break-words font-mono leading-[1.8] text-[#A1A1AA] [overflow-wrap:anywhere]">
        {lyrics || "\u00A0"}
      </div>
    );
  }

  const tokens = Array.from(lyrics.matchAll(/\s+|[^\s]+/g)).map(
    (match) => ({
      text: match[0],
      start: match.index!,
      end: match.index! + match[0].length,
    })
  );

  const words = tokens.filter((t) => !/^\s+$/.test(t.text));
  const chordMap = new Map<number, string[]>();

  [...chords].sort((a, b) => a.position - b.position).forEach((item) => {
    const position = Math.max(0, Math.min(item.position, lyrics.length));
    let target = words.find(
      (w) => position >= w.start && position < w.end
    );
    if (!target) target = words.find((w) => w.start >= position);
    if (!target && words.length) target = words[words.length - 1];
    if (!target) return;
    const existing = chordMap.get(target.start) ?? [];
    existing.push(item.chord);
    chordMap.set(target.start, existing);
  });

  return (
    <div className="w-full min-w-0 whitespace-pre-wrap break-words font-mono leading-[2] text-[#A1A1AA] [overflow-wrap:anywhere]">
      {tokens.map((token, index) => {
        const isWhitespace = /^\s+$/.test(token.text);
        if (isWhitespace) {
          return <span key={`space-${index}`}>{token.text}</span>;
        }
        const wordChords = chordMap.get(token.start) ?? [];
        if (!wordChords.length) {
          return <span key={`word-${index}`}>{token.text}</span>;
        }
        return (
          <ruby
            key={`word-${index}`}
            className="mx-[1px]"
            style={{ rubyPosition: "over", rubyAlign: "start" }}
          >
            <rt className="mb-1 text-left font-mono text-[0.72em] font-bold leading-normal text-[#FFC400]">
              <span className="inline-flex items-center gap-2">
                {wordChords.map((chord, chordIndex) => (
                  <button
                    key={`${chord}-${chordIndex}`}
                    type="button"
                    onClick={() => onSelectChord?.(chord)}
                    title={`Lihat diagram ${chord}`}
                    className="whitespace-nowrap text-[#FFC400] transition hover:text-[#E5AD00] focus-visible:outline-none focus-visible:underline"
                  >
                    {chord}
                  </button>
                ))}
              </span>
            </rt>
            {token.text}
          </ruby>
        );
      })}
    </div>
  );
}

/* =========================================================
   CHORD PROGRESSION (clickable)
========================================================= */

function ChordProgression({
  chords,
  onSelectChord,
}: {
  chords: ChordPosition[];
  onSelectChord?: (chord: string) => void;
}) {
  if (!chords.length) return null;
  return (
    <div className="flex max-w-full flex-wrap gap-2">
      {chords.map((item, index) => (
        <button
          type="button"
          key={`${item.chord}-${index}`}
          onClick={() => onSelectChord?.(item.chord)}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#FFC400]/20 bg-[#FFC400]/[0.055] px-3 font-mono text-sm font-bold text-[#FFC400] transition hover:border-[#FFC400]/50 hover:bg-[#FFC400]/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400]/60 active:scale-95"
        >
          {item.chord}
        </button>
      ))}
    </div>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 mt-10 first:mt-0">
      <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-[#FFC400]/20 bg-[#FFC400]/[0.055] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#FFC400]">
        <CircleDot size={12} strokeWidth={3} />
        {title}
      </span>
    </div>
  );
}

/* =========================================================
   CHORD SHAPES (open + auto barre)
========================================================= */

const OPEN_CHORD_SHAPES: Record<string, ChordShape> = {
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], label: "x32010" },
  Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], label: "x32000" },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 3, 0], label: "x32030" },
  C7: { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], label: "x32310" },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], label: "xx0232" },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], label: "xx0231" },
  Dmaj7: { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3], label: "xx0222" },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], label: "xx0212" },
  Dsus4: { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 2, 3], label: "xx0233" },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], label: "022100" },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], label: "022000" },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], label: "020100" },
  Em7: { frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0], label: "020000" },
  Esus4: { frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0], label: "022200" },
  F: {
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barre: { fret: 1, from: 0, to: 5 },
    label: "133211",
  },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], label: "xx3210" },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], label: "320003" },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], label: "320001" },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], label: "x02220" },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], label: "x02210" },
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], label: "x02020" },
  Am7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], label: "x02010" },
  Asus4: { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0], label: "x02230" },
  Bm: {
    frets: [-1, 2, 4, 4, 3, 2],
    fingers: [0, 1, 3, 4, 2, 1],
    barre: { fret: 2, from: 1, to: 5 },
    label: "x24432",
  },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], label: "x21202" },
};

function generateBarreShape(chordName: string): ChordShape | null {
  const match = chordName.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) return null;
  const [, note, quality] = match;
  const isMinor = /^m(?!aj)/.test(quality);
  const rootIdx = NOTES.indexOf(normalizeRoot(note));
  if (rootIdx < 0) return null;

  const ePos = (rootIdx - 4 + 12) % 12;
  const aPos = (rootIdx - 9 + 12) % 12;

  const useE = ePos >= 1 && (ePos <= aPos || aPos < 1);
  const useA = !useE && aPos >= 1;

  if (useE) {
    const base = isMinor ? [0, 2, 2, 0, 0, 0] : [0, 2, 2, 1, 0, 0];
    const fingers = isMinor ? [1, 3, 4, 1, 1, 1] : [1, 3, 4, 2, 1, 1];
    const frets = base.map((f) => f + ePos);
    return {
      frets,
      fingers,
      barre: { fret: ePos, from: 0, to: 5 },
      label: frets.map((f) => (f === 0 ? "0" : String(f))).join(""),
    };
  }
  if (useA) {
    const base = isMinor ? [-1, 0, 2, 2, 1, 0] : [-1, 0, 2, 2, 2, 0];
    const fingers = isMinor ? [0, 0, 2, 3, 1, 0] : [0, 0, 1, 2, 3, 0];
    const frets = base.map((f) => (f <= 0 ? f : f + aPos));
    return {
      frets,
      fingers,
      barre: { fret: aPos, from: 1, to: 5 },
      label: frets.map((f) => (f < 0 ? "x" : f === 0 ? "0" : String(f))).join(""),
    };
  }
  return null;
}

function getChordShape(chordName: string): ChordShape | null {
  const root = chordName.replace(/\/.*$/, "");
  if (OPEN_CHORD_SHAPES[root]) return OPEN_CHORD_SHAPES[root];
  return generateBarreShape(root);
}

/* =========================================================
   CHORD DIAGRAM (supports barre)
========================================================= */

const DX = {
  STRING_X0: 50,
  STRING_GAP: 32,
  FRET_Y0: 60,
  FRET_GAP: 32,
  VIEW_W: 260,
  VIEW_H: 220,
};

function ChordDiagram({
  chord,
  onClose,
}: {
  chord: string;
  onClose: () => void;
}) {
  const shape = getChordShape(chord);
  const { STRING_X0, STRING_GAP, FRET_Y0, FRET_GAP } = DX;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Chord diagram ${chord}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#0B0B0B] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#737373]">
              Chord Diagram
            </p>
            <h2 className="mt-1 text-3xl font-black text-[#FFC400]">
              {chord}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#333333] text-[#A1A1AA] transition hover:border-[#FFC400]/40 hover:bg-[#202020] hover:text-white"
            aria-label="Close chord diagram"
          >
            <X size={18} />
          </button>
        </div>

        {shape ? (
          <div className="mt-5">
            <svg
              viewBox={`0 0 ${DX.VIEW_W} ${DX.VIEW_H}`}
              role="img"
              aria-label={`${chord} guitar chord shape`}
              className="mx-auto w-full max-w-[280px]"
            >
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <line
                  key={`s${s}`}
                  x1={STRING_X0 + s * STRING_GAP}
                  y1={FRET_Y0}
                  x2={STRING_X0 + s * STRING_GAP}
                  y2={FRET_Y0 + 4 * FRET_GAP}
                  stroke="#a1a1aa"
                  strokeWidth={s === 0 || s === 5 ? 1.8 : 1.2}
                />
              ))}

              <line
                x1={STRING_X0}
                y1={FRET_Y0}
                x2={STRING_X0 + 5 * STRING_GAP}
                y2={FRET_Y0}
                stroke="#e4e4e7"
                strokeWidth={4}
                strokeLinecap="round"
              />

              {[1, 2, 3, 4].map((f) => (
                <line
                  key={`f${f}`}
                  x1={STRING_X0}
                  y1={FRET_Y0 + f * FRET_GAP}
                  x2={STRING_X0 + 5 * STRING_GAP}
                  y2={FRET_Y0 + f * FRET_GAP}
                  stroke="#52525b"
                  strokeWidth={1.2}
                />
              ))}

              {shape.barre && (
                <g>
                  <rect
                    x={STRING_X0 + shape.barre.from * STRING_GAP - 10}
                    y={FRET_Y0 + (shape.barre.fret - 0.5) * FRET_GAP - 10}
                    width={(shape.barre.to - shape.barre.from) * STRING_GAP + 20}
                    height={20}
                    rx={10}
                    fill="#fbbf24"
                  />
                  <text
                    x={STRING_X0 + ((shape.barre.from + shape.barre.to) / 2) * STRING_GAP}
                    y={FRET_Y0 + (shape.barre.fret - 0.5) * FRET_GAP + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#000"
                  >
                    1
                  </text>
                </g>
              )}

              {shape.frets.map((fret, i) => {
                const isBarred =
                  shape.barre &&
                  fret === shape.barre.fret &&
                  i >= shape.barre.from &&
                  i <= shape.barre.to;

                if (isBarred) return null;

                const x = STRING_X0 + i * STRING_GAP;

                if (fret < 0) {
                  return (
                    <text
                      key={`d${i}`}
                      x={x}
                      y={FRET_Y0 - 15}
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="bold"
                      fill="#fbbf24"
                    >
                      ×
                    </text>
                  );
                }
                if (fret === 0) {
                  return (
                    <circle
                      key={`d${i}`}
                      cx={x}
                      cy={FRET_Y0 - 15}
                      r="6"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    />
                  );
                }
                const cy = FRET_Y0 + (fret - 0.5) * FRET_GAP;
                return (
                  <g key={`d${i}`}>
                    <circle cx={x} cy={cy} r="10" fill="#fbbf24" />
                    <text
                      x={x}
                      y={cy + 4}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="bold"
                      fill="#000"
                    >
                      {shape.fingers[i] || ""}
                    </text>
                  </g>
                );
              })}
            </svg>

            <p className="mt-2 text-center font-mono text-sm tracking-[.25em] text-[#A1A1AA]">
              {shape.label}
            </p>
            <p className="mt-3 text-center text-xs text-[#737373]">
              {shape.barre
                ? "Barre chord · tekan semua senar pada fret yang sama."
                : "Diagram chord standar."}
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-[#202020] bg-[#171717] p-5">
            <p className="font-medium text-[#A1A1AA]">
              Bentuk chord ini belum tersedia.
            </p>
            <p className="mt-2 text-sm text-[#737373]">
              Coba chord dasar: C, D, E, G, A, Am, Dm, Em, F, atau Bm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CHORD LIST
========================================================= */

function ChordList({
  chords,
  onSelect,
}: {
  chords: string[];
  onSelect: (chord: string) => void;
}) {
  if (!chords.length) return null;
  return (
    <section className="mb-8 border-b border-white/[0.06] pb-7 lg:border-0 lg:pb-0">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373]">
            Chords
          </p>
          <p className="mt-1 text-xs text-[#7B817F]">
            {chords.length} {chords.length === 1 ? "chord" : "chords"} · tap untuk diagram
          </p>
        </div>
        <Music2 size={16} className="text-[#4a4a4a]" />
      </div>
      <div className="flex max-w-full flex-wrap gap-2">
        {chords.map((chord, index) => (
          <button
            type="button"
            key={`${chord}-${index}`}
            onClick={() => onSelect(chord)}
            className="rounded-xl border border-[#FFC400]/20 bg-[#171717] px-3.5 py-2 font-mono text-sm font-bold text-[#FFC400] transition hover:-translate-y-0.5 hover:border-[#FFC400]/60 hover:bg-[#FFC400]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] active:scale-95"
          >
            {chord}
          </button>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   KEYBOARD SHORTCUTS DIALOG
========================================================= */

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Space", label: "Play / pause auto-scroll" },
  { keys: "↑ / ↓", label: "Transpose naik / turun" },
  { keys: "+ / −", label: "Besar / kecil font" },
  { keys: "M", label: "Nyalakan / matikan metronome" },
  { keys: "F", label: "Fullscreen mode" },
  { keys: "R", label: "Reset transpose" },
  { keys: "T", label: "Scroll ke atas" },
  { keys: "?", label: "Tampilkan bantuan ini" },
  { keys: "Esc", label: "Tutup dialog / modal" },
];

function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0B0B0B] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFC400]/10 text-[#FFC400]">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[#737373]">
                Produktivitas maksimal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#A1A1AA] hover:bg-[#202020]"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="mt-5 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
            >
              <span className="text-sm text-[#A1A1AA]">{s.label}</span>
              <kbd className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2 py-1 font-mono text-[11px] font-bold text-[#FFC400]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================
   METRONOME
========================================================= */

function MetronomePanel({
  bpm,
  setBpm,
  beat,
  metronomeOn,
  toggleMetronome,
}: {
  bpm: number;
  setBpm: (n: number) => void;
  beat: number;
  metronomeOn: boolean;
  toggleMetronome: () => void;
}) {
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  const handleTap = () => {
    const now = Date.now();
    const recent = [...tapTimes, now].filter((t) => now - t < 3000);
    setTapTimes(recent);
    if (recent.length >= 2) {
      const intervals = recent.slice(1).map((t, i) => t - recent[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(Math.max(30, Math.min(240, Math.round(60000 / avg))));
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#111111] to-[#0a0a0a] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-[#737373]">
            <Volume2 size={12} /> Metronome
          </p>
          <p className="mt-1 text-sm text-[#A1A1AA]">
            Practice tempo · <span className="font-mono font-bold text-[#FFC400]">{bpm}</span> BPM
          </p>
        </div>
        <button
          type="button"
          onClick={toggleMetronome}
          aria-pressed={metronomeOn}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl transition active:scale-95 ${
            metronomeOn
              ? "bg-[#FFC400] text-black shadow-lg shadow-[#FFC400]/30"
              : "border border-[#2a2a2a] bg-[#171717] text-[#A1A1AA] hover:border-[#FFC400]/40 hover:text-white"
          }`}
          aria-label={metronomeOn ? "Stop metronome" : "Start metronome"}
        >
          {metronomeOn ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
      </div>

      <div className="mb-3 flex items-center justify-center gap-2.5">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-2.5 rounded-full transition-all duration-150 ${
              beat === n
                ? "w-8 bg-[#FFC400] shadow-[0_0_12px_rgba(255,196,0,0.6)]"
                : "w-2.5 bg-[#333333]"
            }`}
            aria-label={`Beat ${n}`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setBpm(Math.max(30, bpm - 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] text-[#A1A1AA] transition hover:border-[#FFC400]/40 hover:text-white active:scale-95"
          aria-label="Decrease BPM"
        >
          <Minus size={14} />
        </button>
        <input
          type="range"
          min="30"
          max="240"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[#2a2a2a] accent-[#FFC400]"
          aria-label="Metronome BPM"
        />
        <button
          type="button"
          onClick={() => setBpm(Math.min(240, bpm + 1))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] text-[#A1A1AA] transition hover:border-[#FFC400]/40 hover:text-white active:scale-95"
          aria-label="Increase BPM"
        >
          <Plus size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={handleTap}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#333333] py-2 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] transition hover:border-[#FFC400]/40 hover:text-[#FFC400] active:scale-[0.98]"
      >
        <Sparkles size={12} /> Tap Tempo
      </button>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function SongViewer({ song }: { song: Song }) {
  // ---- State
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
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied" | "error">("idle");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [wakeLockOn, setWakeLockOn] = useState(false);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const hydratedRef = useRef(false);

  // ---- Persistence (localStorage)
  useEffect(() => {
    try {
      const fs = localStorage.getItem("melodix:fontSize");
      if (fs) {
        setFontSize(
          Math.max(
            MIN_FONT_SIZE,
            Math.min(MAX_FONT_SIZE, Number(fs) || DEFAULT_FONT_SIZE)
          )
        );
      }
      const ss = localStorage.getItem("melodix:scrollSpeed");
      if (ss) setScrollSpeed(Math.max(1, Math.min(5, Number(ss) || 2)));
      const sp = localStorage.getItem("melodix:showPractice");
      if (sp !== null) setShowPracticeController(sp === "true");
    } catch {}
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem("melodix:fontSize", String(fontSize));
      localStorage.setItem("melodix:scrollSpeed", String(scrollSpeed));
      localStorage.setItem("melodix:showPractice", String(showPracticeController));
    } catch {}
  }, [fontSize, scrollSpeed, showPracticeController]);

  // ---- Share
  const handleShare = useCallback(async () => {
    const shareUrl = window.location.href;
    const shareTitle = `${song.title} — ${song.artist || "Unknown artist"}`;
    const shareText = `Baca chord dan lirik ${song.title} di Melodix.`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        setShareStatus("shared");
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setShareStatus("copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setShareStatus("copied");
      } catch {
        setShareStatus("error");
      }
    }
    window.setTimeout(() => setShareStatus("idle"), 2600);
  }, [song.title, song.artist]);

  // ---- Fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ---- Wake lock when autoscrolling
  useEffect(() => {
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          setWakeLockOn(true);
          wakeLockRef.current.addEventListener("release", () =>
            setWakeLockOn(false)
          );
        }
      } catch {}
    };
    if (autoScroll) void acquire();
    return () => {
      const lock = wakeLockRef.current;
      if (lock) {
        void lock.release().catch(() => {});
      }
      wakeLockRef.current = null;
      setWakeLockOn(false);
    };
  }, [autoScroll]);

  // ---- Reset per-song
  useEffect(() => {
    setCapoOffset(Number(song.capo ?? 0));
    setBpm(Number(song.bpm ?? 90) || 90);
    setShift(0);
    setSelectedChord(null);
    setMetronomeOn(false);
  }, [song.title, song.capo, song.bpm]);

  // ---- Parse
  const rawLyrics = song.lyricsWithChords || "";
  const originalLines = useMemo(() => parseChordLyrics(rawLyrics), [rawLyrics]);
  const shapeShift = shift - capoOffset;
  const transposedLyrics = useMemo(
    () => transposeLyrics(rawLyrics, shapeShift),
    [rawLyrics, shapeShift]
  );
  const parsedLines = useMemo(
    () => parseChordLyrics(transposedLyrics),
    [transposedLyrics]
  );

  // ---- Chords summary
  const displayedChords = useMemo(() => {
    const result: string[] = [];
    const sourceChords = Array.isArray(song.uniqueChords) ? song.uniqueChords : [];
    const detectedChords: string[] = [];
    for (const line of originalLines) {
      if (line.type !== "line") continue;
      for (const item of line.chords) {
        if (!detectedChords.includes(item.chord)) detectedChords.push(item.chord);
      }
    }
    for (const value of [...sourceChords, ...detectedChords]) {
      const chord = String(value ?? "").trim();
      if (!isChord(chord)) continue;
      const transposed = transposeChord(chord, shapeShift);
      if (!result.includes(transposed)) result.push(transposed);
    }
    return result;
  }, [song.uniqueChords, originalLines, shapeShift]);

  const displayedKey = useMemo(() => {
    if (!song.originalKey) return null;
    return transposeChord(song.originalKey, shift);
  }, [song.originalKey, shift]);

  // ---- Auto-scroll
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
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const delta = Math.min(timestamp - lastTimeRef.current, 50);
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
        top: Math.min((pixelsPerSecond * delta) / 1000, remaining),
        behavior: "auto",
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
      if (document.hidden) lastTimeRef.current = null;
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ---- Scroll progress
  useEffect(() => {
    let frame = 0;
    const updateProgress = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress(
          scrollable > 0
            ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100))
            : 0
        );
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

  // ---- Metronome
  useEffect(() => {
    if (!metronomeOn) {
      setBeat(0);
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    let audioContext: AudioContext | null = null;
    let currentBeat = 0;

    try {
      audioContext = new window.AudioContext();
    } catch {
      setMetronomeOn(false);
      return;
    }

    const click = () => {
      if (!audioContext) return;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.frequency.value = currentBeat % 4 === 0 ? 1200 : 800;
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + 0.08);
      currentBeat = (currentBeat + 1) % 4;
      setBeat(currentBeat === 0 ? 4 : currentBeat);
    };

    void audioContext.resume();
    click();
    timer = setInterval(click, 60000 / Math.max(30, Math.min(240, bpm)));

    return () => {
      if (timer) clearInterval(timer);
      if (audioContext) void audioContext.close();
    };
  }, [metronomeOn, bpm]);

  // ---- Controls
  const resetScroll = useCallback(() => {
    stopAutoScroll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stopAutoScroll]);

  const decreaseFont = useCallback(() => {
    setFontSize((c) => Math.max(MIN_FONT_SIZE, c - 1));
  }, []);
  const increaseFont = useCallback(() => {
    setFontSize((c) => Math.min(MAX_FONT_SIZE, c + 1));
  }, []);
  const resetTranspose = useCallback(() => setShift(0), []);

  // ---- Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          setAutoScroll((v) => !v);
          break;
        case "ArrowUp":
          e.preventDefault();
          setShift((v) => Math.min(12, v + 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setShift((v) => Math.max(-12, v - 1));
          break;
        case "=":
        case "+":
          e.preventDefault();
          setFontSize((v) => Math.min(MAX_FONT_SIZE, v + 1));
          break;
        case "-":
        case "_":
          e.preventDefault();
          setFontSize((v) => Math.max(MIN_FONT_SIZE, v - 1));
          break;
        case "m":
        case "M":
          setMetronomeOn((v) => !v);
          break;
        case "f":
        case "F":
          void toggleFullscreen();
          break;
        case "r":
        case "R":
          setShift(0);
          break;
        case "t":
        case "T":
          resetScroll();
          break;
        case "?":
          setShowShortcuts((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetScroll, toggleFullscreen]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen w-full overflow-x-clip bg-[#050505] text-[#F5F5F5]">
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#050505]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/songs"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg py-2 text-sm font-medium text-[#A1A1AA] transition hover:text-white"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Songs</span>
            </Link>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#A1A1AA] lg:hidden">
              {song.title}
            </p>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#FFC400]/25 bg-[#FFC400]/[0.08] px-3 text-sm font-semibold text-[#FFC400] transition hover:border-[#FFC400]/60 hover:bg-[#FFC400]/[0.14] active:scale-[0.97] lg:h-10 lg:px-4"
              aria-label="Bagikan lagu"
            >
              {shareStatus === "copied" || shareStatus === "shared" ? (
                <Check size={15} />
              ) : (
                <Share2 size={15} />
              )}
              <span className="hidden sm:inline">
                {shareStatus === "copied"
                  ? "Disalin"
                  : shareStatus === "shared"
                    ? "Dibagikan"
                    : shareStatus === "error"
                      ? "Gagal"
                      : "Bagikan"}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Transpose */}
            <div className="flex h-10 min-w-0 items-center rounded-xl border border-[#1f1f1f] bg-[#111111] p-0.5">
              <button
                type="button"
                onClick={() => setShift((v) => Math.max(-12, v - 1))}
                className="flex h-9 w-8 items-center justify-center rounded-lg text-[#A1A1AA] transition hover:bg-[#202020] hover:text-white active:scale-90"
                aria-label="Transpose down"
              >
                <Minus size={14} />
              </button>
              <button
                type="button"
                onClick={resetTranspose}
                className="min-w-[42px] px-1 text-center font-mono text-xs font-bold text-[#A1A1AA] transition hover:text-[#FFC400]"
                title="Reset transpose"
              >
                {shift > 0 ? `+${shift}` : shift}
              </button>
              <button
                type="button"
                onClick={() => setShift((v) => Math.min(12, v + 1))}
                className="flex h-9 w-8 items-center justify-center rounded-lg text-[#A1A1AA] transition hover:bg-[#202020] hover:text-white active:scale-90"
                aria-label="Transpose up"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Font size */}
            <div className="flex h-10 min-w-0 items-center rounded-xl border border-[#1f1f1f] bg-[#111111] p-0.5">
              <button
                type="button"
                onClick={decreaseFont}
                disabled={fontSize <= MIN_FONT_SIZE}
                className="flex h-9 w-8 items-center justify-center rounded-lg text-xs font-bold text-[#A1A1AA] transition hover:bg-[#202020] hover:text-white disabled:opacity-30"
                aria-label="Decrease text size"
              >
                A−
              </button>
              <span className="min-w-[26px] text-center font-mono text-[11px] font-bold text-[#737373]">
                {fontSize}
              </span>
              <button
                type="button"
                onClick={increaseFont}
                disabled={fontSize >= MAX_FONT_SIZE}
                className="flex h-9 w-8 items-center justify-center rounded-lg text-xs font-bold text-[#A1A1AA] transition hover:bg-[#202020] hover:text-white disabled:opacity-30"
                aria-label="Increase text size"
              >
                A+
              </button>
            </div>

            {/* Fullscreen + Shortcuts */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[#1f1f1f] bg-[#111111] text-[#A1A1AA] transition hover:border-[#FFC400]/40 hover:text-white sm:flex"
              aria-label={isFullscreen ? "Keluar fullscreen" : "Fullscreen"}
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setShowShortcuts(true)}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[#1f1f1f] bg-[#111111] text-[#A1A1AA] transition hover:border-[#FFC400]/40 hover:text-white sm:flex"
              aria-label="Keyboard shortcuts"
              title="Shortcuts (?)"
            >
              <Keyboard size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ============ SONG INFO ============ */}
      <section className="mx-auto max-w-[1320px] px-4 pb-8 pt-7 sm:pb-10 sm:pt-10 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[250px_minmax(0,1fr)]">
          {/* Cover */}
          <div className="mx-auto aspect-square w-full max-w-[190px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#151515] shadow-[0_18px_55px_rgba(0,0,0,0.35)] sm:mx-0 sm:max-w-none lg:max-w-[250px] lg:rounded-3xl">
            {song.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.coverImageUrl}
                alt={`${song.title} cover`}
                loading="eager"
                decoding="async"
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[#4a4a4a]">
                <Music2 size={32} />
                <span className="text-[10px] font-bold tracking-[0.2em]">
                  NO COVER
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-[#737373]">
              {song.genre || "Song"}
            </p>
            <h1 className="mt-2 break-words text-4xl font-black leading-[0.98] tracking-[-0.045em] text-[#F5F5F5] sm:text-5xl lg:text-6xl xl:text-7xl">
              {song.title}
            </h1>
            <p className="mt-2 break-words text-lg font-medium text-[#A1A1AA]">
              {song.artist || "Unknown artist"}
            </p>

            <div className="mt-4 flex max-w-full flex-wrap gap-2">
              {displayedKey && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#202020] px-3 py-1.5 text-xs text-[#A1A1AA]">
                  <Music2 size={11} className="text-[#FFC400]" />
                  Key{" "}
                  <span className="font-mono font-bold text-white">
                    {displayedKey}
                  </span>
                </span>
              )}
              <label className="flex items-center gap-2 rounded-full bg-[#202020] px-3 py-1.5 text-xs text-[#A1A1AA]">
                Capo
                <select
                  value={capoOffset}
                  onChange={(e) => setCapoOffset(Number(e.target.value))}
                  className="bg-transparent font-mono font-bold text-white outline-none"
                  aria-label="Capo position"
                >
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={i} className="bg-[#202020]">
                      {i}
                    </option>
                  ))}
                </select>
              </label>
              {song.bpm ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#202020] px-3 py-1.5 text-xs text-[#A1A1AA]">
                  <Volume2 size={11} className="text-[#FFC400]" />
                  <span className="font-mono font-bold text-white">
                    {song.bpm}
                  </span>{" "}
                  BPM
                </span>
              ) : null}
              {song.tuning ? (
                <span className="max-w-full break-words rounded-full bg-[#202020] px-3 py-1.5 text-xs text-[#A1A1AA]">
                  {song.tuning}
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {song.youtubeUrl && (
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-zinc-200 active:scale-95"
                >
                  <Youtube size={14} /> YouTube
                </a>
              )}
              {song.spotifyTrackUrl && (
                <a
                  href={song.spotifyTrackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#202020] bg-[#111111] px-4 py-2 text-sm font-bold text-[#A1A1AA] transition hover:border-[#FFC400]/50 hover:text-white active:scale-95"
                >
                  <Music2 size={14} /> Spotify
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ MAIN LAYOUT ============ */}
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-0 px-4 lg:grid-cols-[270px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-8 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-8">
        {/* Sidebar */}
        <aside className="min-w-0 space-y-4 pb-2 lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1">
          <div className="lg:rounded-2xl lg:border lg:border-white/[0.07] lg:bg-gradient-to-b lg:from-[#111111] lg:to-[#090909] lg:p-4 xl:p-5">
            <ChordList chords={displayedChords} onSelect={setSelectedChord} />
          </div>
          <MetronomePanel
            bpm={bpm}
            setBpm={setBpm}
            beat={beat}
            metronomeOn={metronomeOn}
            toggleMetronome={() => setMetronomeOn((v) => !v)}
          />
          {wakeLockOn && (
            <div className="hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-400 lg:flex">
              <CircleDot size={12} className="animate-pulse" />
              Layar tetap nyala
            </div>
          )}
        </aside>

        {/* Lyrics */}
        <section className="min-w-0 pb-16 lg:col-start-2 lg:row-start-1 lg:rounded-2xl lg:border lg:border-white/[0.07] lg:bg-[#090909] lg:px-7 lg:pb-20 xl:px-10">
          <div
            className="mx-auto w-full min-w-0 max-w-[850px] px-1 py-4 pb-36 sm:px-4 sm:py-6 sm:pb-40 lg:px-0 lg:py-7 lg:pb-24"
            style={{ fontSize: `${fontSize}px` }}
          >
            {parsedLines.map((line, index) => {
              if (line.type === "section") {
                return <SectionHeader key={`section-${index}`} title={line.title} />;
              }
              if (line.lyrics.trim() === "" && line.chords.length > 0) {
                return (
                  <div key={`progression-${index}`} className="mb-8 max-w-full">
                    <ChordProgression
                      chords={line.chords}
                      onSelectChord={setSelectedChord}
                    />
                  </div>
                );
              }
              if (line.lyrics === "" && line.chords.length === 0) {
                return (
                  <div key={`empty-${index}`} className="h-5" aria-hidden="true" />
                );
              }
              return (
                <div key={`line-${index}`} className="mb-5 w-full min-w-0 lg:mb-6">
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
      </div>

      {/* ============ FLOATING PRACTICE CONTROLLER ============ */}
      {showPracticeController ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/[0.08] bg-[#050505]/[0.97] text-[#F5F5F5] shadow-[0_-10px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:inset-x-auto lg:bottom-6 lg:right-8 lg:w-[400px] lg:rounded-2xl lg:border lg:border-white/[0.09] lg:bg-[#080808]/[0.98] lg:shadow-[0_18px_60px_rgba(0,0,0,0.7)]"
          role="region"
          aria-label="Floating song practice controls"
        >
          <div className="mx-auto flex w-full max-w-4xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 lg:px-3">
            <button
              type="button"
              onClick={() => {
                stopAutoScroll();
                setShowPracticeController(false);
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#171717] text-[#A1A1AA] transition hover:border-[#FFC400]/40 hover:text-white active:scale-95"
              aria-label="Sembunyikan kontrol"
              title="Sembunyikan"
            >
              <X size={18} />
            </button>

            <div className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#FFC400]/15 bg-[#241D08] px-1.5 sm:gap-3 sm:px-3">
              <button
                type="button"
                onClick={() => setScrollSpeed((v) => Math.max(1, v - 1))}
                disabled={scrollSpeed <= 1}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#E5AD00] transition hover:bg-[#332A10] disabled:opacity-30 active:scale-90"
                aria-label="Perlambat auto-scroll"
              >
                <Minus size={16} />
              </button>
              <div className="min-w-[52px] text-center">
                <span
                  className="block font-mono text-sm font-bold tabular-nums text-[#FFC400]"
                  aria-live="polite"
                >
                  {SPEED_LABELS[scrollSpeed]}
                </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8A8A8A]">
                  Speed
                </span>
              </div>
              <button
                type="button"
                onClick={() => setScrollSpeed((v) => Math.min(5, v + 1))}
                disabled={scrollSpeed >= 5}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#E5AD00] transition hover:bg-[#332A10] disabled:opacity-30 active:scale-90"
                aria-label="Percepat auto-scroll"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAutoScroll((v) => !v)}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-black shadow-md shadow-[#FFC400]/20 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] ${
                autoScroll
                  ? "bg-[#D49F00] hover:bg-[#B88900]"
                  : "bg-[#FFC400] hover:bg-[#E5AD00]"
              }`}
              aria-pressed={autoScroll}
              aria-label={autoScroll ? "Pause auto-scroll" : "Mulai auto-scroll"}
              title={autoScroll ? "Pause (Space)" : "Play (Space)"}
            >
              {autoScroll ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" className="ml-0.5" />
              )}
            </button>
          </div>

          <div
            className="h-1 w-full overflow-hidden bg-[#202020]"
            aria-label={`Posisi lagu ${Math.round(scrollProgress)} persen`}
          >
            <div
              className="h-full bg-gradient-to-r from-[#FFC400] to-[#FFE066] transition-[width] duration-100"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPracticeController(true)}
          className="fixed bottom-4 right-4 z-[80] inline-flex h-12 items-center gap-2 rounded-2xl bg-[#FFC400] px-5 text-sm font-bold text-black shadow-lg shadow-[#FFC400]/25 transition hover:bg-[#E5AD00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC400] active:scale-95 lg:bottom-6 lg:right-8"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          {autoScroll ? (
            <Pause size={16} fill="currentColor" />
          ) : (
            <Play size={16} fill="currentColor" />
          )}
          Kontrol
        </button>
      )}

      {/* ============ BACK TO TOP ============ */}
      {scrollProgress > 20 && (
        <button
          type="button"
          onClick={resetScroll}
          style={{
            bottom: showPracticeController
              ? "calc(env(safe-area-inset-bottom) + 5.5rem)"
              : "calc(env(safe-area-inset-bottom) + 4.5rem)",
          }}
          className="fixed right-4 z-[70] flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-[#0F0F0F]/95 text-[#A1A1AA] shadow-lg shadow-black/40 backdrop-blur transition hover:border-[#FFC400]/40 hover:text-[#FFC400] active:scale-90 sm:right-6 lg:right-8"
          aria-label="Kembali ke atas"
          title="Kembali ke atas (T)"
        >
          <ChevronUp size={18} />
        </button>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 text-center lg:px-8 lg:pb-32">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#FFC400]">
            <Sparkles size={12} />
            Melodix
            <Sparkles size={12} />
          </div>
          <p className="text-sm text-[#A1A1AA]">
            {song.title}
            {song.artist ? ` · ${song.artist}` : ""}
          </p>
          <p className="text-[11px] leading-relaxed text-[#4a4a4a]">
            Dibuat dengan ❤ untuk para musisi. Tekan{" "}
            <kbd className="rounded border border-[#2a2a2a] bg-[#171717] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#FFC400]">
              ?
            </kbd>{" "}
            untuk melihat semua shortcut keyboard.
          </p>
        </div>
      </footer>

      {/* ============ CHORD MODAL ============ */}
      {selectedChord ? (
        <ChordDiagram
          chord={selectedChord}
          onClose={() => setSelectedChord(null)}
        />
      ) : null}

      {/* ============ SHORTCUTS MODAL ============ */}
      {showShortcuts ? (
        <KeyboardShortcutsDialog onClose={() => setShowShortcuts(false)} />
      ) : null}
    </main>
  );
}
