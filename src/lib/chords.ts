// src/lib/chords.ts

const CHORD_ROOTS = [
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
];

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
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
  "post-chorus",
  "post chorus",
  "bridge",
  "interlude",
  "instrumental",
  "music",
  "solo",
  "outro",
  "ending",
  "refrain",
]);

export type ChordPosition = {
  chord: string;
  position: number;
};

export type ParsedChordLine = {
  chords: ChordPosition[];
  lyrics: string;
};

export type ParsedSection =
  | {
      type: "section";
      title: string;
    }
  | {
      type: "line";
      chords: ChordPosition[];
      lyrics: string;
    };

/**
 * Mengecek apakah sebuah token merupakan chord.
 *
 * Contoh valid:
 * G
 * C
 * Dm
 * F#m
 * Bb
 * Cmaj7
 * G7
 * Asus4
 * D/F#
 * Am7
 */
export function isChord(value: string): boolean {
  const chord = value.trim();

  if (!chord) {
    return false;
  }

  const match = chord.match(
    /^([A-G](?:#|b)?)(m|maj|min|dim|aug|sus|add|M|[0-9]|[-+()]|\/)*.*$/i
  );

  return Boolean(match);
}

/**
 * Mengecek apakah [Something] merupakan nama section.
 *
 * Contoh:
 * [Intro]
 * [Verse 1]
 * [Pre-chorus]
 * [Chorus]
 * [Music]
 */
export function isSection(value: string): boolean {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (SECTION_NAMES.has(normalized)) {
    return true;
  }

  // Mendukung:
  // Verse 1
  // Verse 2
  // Chorus 1
  // Bridge 2
  if (
    /^(verse|chorus|bridge|pre-chorus|post-chorus|refrain|solo|intro|outro|music)(\s+\d+)?$/i.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Membersihkan nama section.
 *
 * [Verse 1] -> Verse 1
 * [Chorus]  -> Chorus
 */
export function cleanSectionName(value: string): string {
  return value
    .trim()
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .trim();
}

/**
 * Transpose satu chord.
 */
export function transposeChord(
  chord: string,
  semitones: number
): string {
  const value = chord.trim();

  const match = value.match(/^([A-G](?:#|b)?)(.*)$/);

  if (!match) {
    return chord;
  }

  const originalRoot = match[1];
  const suffix = match[2];

  const normalizedRoot =
    FLAT_TO_SHARP[originalRoot] ?? originalRoot;

  const index = CHORD_ROOTS.indexOf(normalizedRoot);

  if (index === -1) {
    return chord;
  }

  const newIndex =
    (index + semitones) % CHORD_ROOTS.length;

  const safeIndex =
    newIndex < 0
      ? newIndex + CHORD_ROOTS.length
      : newIndex;

  return `${CHORD_ROOTS[safeIndex]}${suffix}`;
}

/**
 * Transpose seluruh teks chord.
 *
 * Hanya chord yang berada di [ ] yang ditranspose.
 */
export function transposeText(
  text: string,
  semitones: number
): string {
  if (semitones === 0) {
    return text;
  }

  return text.replace(
    /\[([A-G](?:#|b)?[^\\\]\n]*)\]/g,
    (_, chord: string) => {
      return `[${transposeChord(chord, semitones)}]`;
    }
  );
}

/**
 * Parse satu baris:
 *
 * [G]I wanna be your[C] day
 *
 * menjadi:
 *
 * chords:
 *   G -> position 0
 *   C -> position 17
 *
 * lyrics:
 *   I wanna be your day
 */
export function parseChordLine(
  line: string
): ParsedChordLine {
  const chords: ChordPosition[] = [];

  let lyrics = "";
  let cursor = 0;

  const regex = /\[([^\]\n]+)\]/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const beforeChord = line.slice(cursor, match.index);

    const token = match[1].trim();

    if (isChord(token)) {
      /**
       * Posisi chord dihitung berdasarkan panjang
       * teks lirik yang sudah dibangun.
       */
      chords.push({
        chord: token,
        position: lyrics.length,
      });

      lyrics += beforeChord;
    } else {
      /**
       * Kalau bukan chord, jangan dibuang.
       * Bisa jadi section atau teks biasa.
       */
      lyrics += beforeChord;
      lyrics += match[0];
    }

    cursor = match.index + match[0].length;
  }

  lyrics += line.slice(cursor);

  return {
    chords,
    lyrics,
  };
}

/**
 * Parse seluruh lyricsWithChords.
 *
 * Input:
 *
 * [Intro]
 * [G][C][G][C]
 *
 * [Verse 1]
 * [G]I wanna be your[C] day
 *
 * Output:
 *
 * section
 * line
 * line
 */
export function parseLyrics(
  text: string
): ParsedSection[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const result: ParsedSection[] = [];

  for (const originalLine of lines) {
    const line = originalLine.trimEnd();

    if (!line.trim()) {
      /**
       * Empty line tetap dipertahankan sebagai line kosong.
       */
      result.push({
        type: "line",
        chords: [],
        lyrics: "",
      });

      continue;
    }

    /**
     * Section harus berupa:
     *
     * [Verse 1]
     * [Chorus]
     * [Music]
     */
    const sectionMatch = line.match(
      /^\[([^\]\n]+)\]\s*$/
    );

    if (
      sectionMatch &&
      isSection(sectionMatch[1])
    ) {
      result.push({
        type: "section",
        title: cleanSectionName(
          sectionMatch[1]
        ),
      });

      continue;
    }

    const parsed = parseChordLine(line);

    result.push({
      type: "line",
      chords: parsed.chords,
      lyrics: parsed.lyrics,
    });
  }

  return result;
}

/**
 * Mengambil daftar chord unik dari lyricsWithChords.
 *
 * Ini berguna sebagai fallback kalau uniqueChords
 * Firebase tidak tersedia.
 */
export function extractUniqueChords(
  text: string
): string[] {
  const chords: string[] = [];

  const regex = /\[([^\]\n]+)\]/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const token = match[1].trim();

    if (
      isChord(token) &&
      !isSection(token) &&
      !chords.includes(token)
    ) {
      chords.push(token);
    }
  }

  return chords;
}

/**
 * Membuat chord progression dari baris seperti:
 *
 * [G][C][G][C]
 */
export function parseChordProgression(
  line: string
): string[] {
  const chords: string[] = [];

  const regex = /\[([^\]\n]+)\]/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const token = match[1].trim();

    if (
      isChord(token) &&
      !isSection(token)
    ) {
      chords.push(token);
    }
  }

  return chords;
}
