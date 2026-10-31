
import {
  collection,
  getDocs,
  getDoc,
  limit,
  query,
  where,
  doc,
} from "firebase/firestore";

import { db } from "./firebase";
import type { Band } from "@/types/band";
import type { Song } from "@/types/song";

const bandsRef = collection(db, "bands");
const songsRef = collection(db, "songs");

const MAX_RESULTS = 500;

// Song lama tetap kompatibel, sedangkan bandId menjadi relasi tambahan.
type SongWithBandId = Song & {
  bandId?: string;
};

/**
 * Mengubah berbagai format tanggal Firestore menjadi timestamp.
 */
function getTimestamp(value: unknown): number {
  if (!value) return 0;

  if (typeof value === "number") return value;

  if (value instanceof Date) return value.getTime();

  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  return 0;
}

/**
 * Mengambil semua band yang sudah dipublikasikan.
 *
 * Filter isPublished harus tetap digunakan agar sesuai
 * dengan Firestore Security Rules.
 */
export async function getPublishedBands(): Promise<Band[]> {
  try {
    const q = query(
      bandsRef,
      where("isPublished", "==", true),
      limit(MAX_RESULTS)
    );

    const snap = await getDocs(q);

    const bands: Band[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Band, "id">),
    }));

    return bands.sort(
      (a, b) =>
        getTimestamp(b.updatedAt) -
        getTimestamp(a.updatedAt)
    );
  } catch (error) {
    console.error(
      "[BANDS] Gagal mengambil band publik:",
      error
    );

    return [];
  }
}

/**
 * Mengambil band berdasarkan slug.
 *
 * Hanya band yang sudah dipublikasikan yang dapat diakses.
 */
export async function getBandBySlug(
  slug: string
): Promise<Band | null> {
  try {
    const q = query(
      bandsRef,
      where("slug", "==", slug),
      where("isPublished", "==", true),
      limit(1)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const d = snap.docs[0];

    return {
      id: d.id,
      ...(d.data() as Omit<Band, "id">),
    };
  } catch (error) {
    console.error(
      "[BANDS] Gagal mengambil band berdasarkan slug:",
      error
    );

    return null;
  }
}

/**
 * Mengambil band berdasarkan document ID.
 */
export async function getBandById(
  id: string
): Promise<Band | null> {
  try {
    const snap = await getDoc(
      doc(db, "bands", id)
    );

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...(snap.data() as Omit<Band, "id">),
    };
  } catch (error) {
    console.error(
      "[BANDS] Gagal mengambil band berdasarkan ID:",
      error
    );

    return null;
  }
}

/**
 * Mengambil semua lagu yang sudah dipublikasikan
 * milik sebuah band.
 *
 * Mendukung:
 * 1. Relasi bandId.
 * 2. Relasi artist untuk data lagu lama.
 */
export async function getSongsByBand(
  bandId: string,
  bandName: string
): Promise<Song[]> {
  try {
    const q = query(
      songsRef,
      where("isPublished", "==", true),
      limit(MAX_RESULTS)
    );

    const snap = await getDocs(q);

    const songs: Song[] = snap.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Song, "id">),
      }))
      .filter((song) => {
        const compatibleSong = song as SongWithBandId;

        const belongsById =
          compatibleSong.bandId === bandId;

        const belongsByArtist =
          typeof compatibleSong.artist === "string" &&
          compatibleSong.artist.trim().toLowerCase() ===
            bandName.trim().toLowerCase();

        return belongsById || belongsByArtist;
      });

    return songs;
  } catch (error) {
    console.error(
      "[BANDS] Gagal mengambil lagu band:",
      error
    );

    return [];
  }
}
