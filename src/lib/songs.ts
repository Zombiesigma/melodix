import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import type { Song } from "@/types/song";

const songsRef = collection(db, "songs");

export async function getPublishedSongs(): Promise<Song[]> {
  const q = query(
    songsRef,
    where("isPublished", "==", true),
    orderBy("updatedAt", "desc"),
    limit(100)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Song, "id">),
  }));
}

export async function getSongBySlug(slug: string): Promise<Song | null> {
  const decodedSlug = decodeURIComponent(slug);

  // Cari lagu berdasarkan slug saja.
  // Tidak perlu composite index slug + isPublished.
  // Firestore Security Rules are not filters. The query itself must
  // guarantee that every possible result is publicly readable.
  const q = query(
    songsRef,
    where("slug", "==", decodedSlug),
    where("isPublished", "==", true),
    limit(1)
  );

  const snap = await getDocs(q);

  if (!snap.empty) {
    const d = snap.docs[0];
    const data = d.data() as Omit<Song, "id">;

    return {
      id: d.id,
      ...data,
    };
  }

  // Fallback:
  // Kalau parameter URL ternyata merupakan Firebase document ID.
  const byId = await getDoc(
    doc(db, "songs", decodedSlug)
  );

  if (byId.exists()) {
    const data = byId.data() as Omit<Song, "id">;

    if (data.isPublished === true) {
      return {
        id: byId.id,
        ...data,
      };
    }
  }

  return null;
}

export async function getSongById(id: string): Promise<Song | null> {
  const snap = await getDoc(
    doc(db, "songs", id)
  );

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data() as Omit<Song, "id">;

  if (data.isPublished !== true) {
    return null;
  }

  return {
    id: snap.id,
    ...data,
  };
}
