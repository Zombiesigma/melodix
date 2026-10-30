import {
  collection,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  where,
  doc,
} from "firebase/firestore";

import { db } from "./firebase";
import type { Band } from "@/types/band";
import type { Song } from "@/types/song";

const bandsRef = collection(db, "bands");

/**
 * Ambil semua band yang dipublish.
 */
export async function getPublishedBands(): Promise<Band[]> {
  try {
    const q = query(
      bandsRef,
      where("isPublished", "==", true),
      orderBy("updatedAt", "desc"),
      limit(100)
    );

    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Band, "id">),
    }));
  } catch (error) {
    console.error("Gagal mengambil daftar band:", error);
    return [];
  }
}

/**
 * Ambil band berdasarkan slug.
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
    console.error("Gagal mengambil band:", error);
    return null;
  }
}

/**
 * Ambil band berdasarkan document ID.
 */
export async function getBandById(
  id: string
): Promise<Band | null> {
  try {
    const snap = await getDoc(doc(db, "bands", id));

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...(snap.data() as Omit<Band, "id">),
    };
  } catch (error) {
    console.error("Gagal mengambil band:", error);
    return null;
  }
}

/**
 * Ambil semua lagu milik sebuah band.
 *
 * Untuk sementara menggunakan field `artist`
 * supaya data lagu lama langsung kompatibel.
 */
export async function getSongsByBand(
  bandId: string,
  bandName: string
): Promise<Song[]> {
  try {
    // Stable relationship first; artist-name lookup remains as a legacy fallback.
    const byBandId = query(
      collection(db, "songs"),
      where("bandId", "==", bandId),
      where("isPublished", "==", true),
      limit(100)
    );
    const snap = await getDocs(byBandId);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Song, "id">) }));
    }

    const legacy = query(
      collection(db, "songs"),
      where("artist", "==", bandName),
      where("isPublished", "==", true),
      limit(100)
    );
    const legacySnap = await getDocs(legacy);
    return legacySnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Song, "id">) }));
  } catch (error) {
    console.error("Gagal mengambil lagu band:", error);
    return [];
  }
}
