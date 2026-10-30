"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SearchSong = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  coverImageUrl: string;
  originalKey: string;
};

type SearchBand = {
  id: string;
  slug: string;
  name: string;
  genre: string;
  coverImageUrl: string;
};

type Props = {
  songs: SearchSong[];
  bands: SearchBand[];
};

const FAVORITES_KEY = "chord-home-favorite-songs";

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
    </svg>
  );
}

function ShuffleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 3 4 4-4 4" /><path d="M4 17h2.5a5 5 0 0 0 4-2l3-4a5 5 0 0 1 4-2H20" /><path d="m16 17 4 4-4-4" /><path d="M4 7h2.5a5 5 0 0 1 3.5 1.5" /><path d="M14 15.5a5 5 0 0 0 3.5 1.5H20" />
    </svg>
  );
}

function HeartGlyph({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </svg>
  );
}

export default function HomeQuickActions({ songs, bands }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"songs" | "bands" | "favorites">("songs");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter((value): value is string => typeof value === "string"));
        }
      }
    } catch {
      // Ignore unavailable or malformed local storage.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Favorites remain usable in memory if storage is unavailable.
    }
  }, [favorites, ready]);

  const normalizedQuery = query.trim().toLocaleLowerCase("id");
  const filteredSongs = useMemo(
    () =>
      songs.filter((song) =>
        [song.title, song.artist, song.originalKey]
          .some((value) => value.toLocaleLowerCase("id").includes(normalizedQuery))
      ),
    [songs, normalizedQuery]
  );
  const filteredBands = useMemo(
    () =>
      bands.filter((band) =>
        [band.name, band.genre]
          .some((value) => value.toLocaleLowerCase("id").includes(normalizedQuery))
      ),
    [bands, normalizedQuery]
  );
  const favoriteSongs = useMemo(
    () => songs.filter((song) => favorites.includes(song.id)),
    [songs, favorites]
  );

  const toggleFavorite = useCallback((songId: string) => {
    setFavorites((current) =>
      current.includes(songId)
        ? current.filter((id) => id !== songId)
        : [...current, songId]
    );
  }, []);

  const openRandomSong = useCallback(() => {
    if (songs.length === 0) return;
    const song = songs[Math.floor(Math.random() * songs.length)];
    router.push(`/song/${encodeURIComponent(song.slug)}`);
  }, [router, songs]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setTab("songs");
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300 sm:w-auto sm:gap-2 sm:px-3"
          aria-label="Search songs and bands"
          title="Search songs and bands"
        >
          <SearchGlyph />
          <span className="hidden text-xs font-semibold sm:inline">Search</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("favorites");
            setQuery("");
            setIsOpen(true);
          }}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300"
          aria-label={`Open favorites, ${favorites.length} saved songs`}
          title="Favorite songs"
        >
          <HeartGlyph filled={favorites.length > 0} />
          {favorites.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-black">
              {favorites.length > 99 ? "99+" : favorites.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={openRandomSong}
          disabled={songs.length === 0}
          className="hidden h-10 items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40 sm:flex"
          title="Open a random song"
        >
          <ShuffleGlyph />
          Surprise me
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 px-3 pb-6 pt-[10vh] backdrop-blur-sm sm:px-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-search-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black/50"
          >
            <div className="border-b border-white/10 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">MELODIX Library</p>
                  <h2 id="home-search-title" className="mt-1 text-lg font-black text-white">Find your next song</h2>
                </div>
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white/50 transition hover:text-white" aria-label="Close search">
                  Esc <span className="ml-1">✕</span>
                </button>
              </div>

              <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 focus-within:border-amber-400/40">
                <SearchGlyph />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={tab === "bands" ? "Search band or genre..." : "Search song, artist, or key..."}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                />
                {query && <button type="button" onClick={() => setQuery("")} className="text-xs text-white/40 hover:text-white">Clear</button>}
              </label>

              <div className="mt-4 flex gap-2 overflow-x-auto">
                {([
                  ["songs", "Songs"],
                  ["bands", "Bands"],
                  ["favorites", `Favorites (${favorites.length})`],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${tab === value ? "bg-amber-400 text-black" : "border border-white/10 bg-white/[0.025] text-white/50 hover:text-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[48vh] overflow-y-auto p-2 sm:p-3">
              {tab === "songs" && (
                filteredSongs.length ? filteredSongs.slice(0, 30).map((song) => (
                  <div key={song.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]">
                    <button type="button" onClick={() => router.push(`/song/${encodeURIComponent(song.slug)}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      {song.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={song.coverImageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-amber-400"><MusicGlyph /></span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white">{song.title || "Untitled"}</span>
                        <span className="mt-1 block truncate text-xs text-white/40">{song.artist || "Unknown Artist"}{song.originalKey ? ` · ${song.originalKey}` : ""}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => toggleFavorite(song.id)} className={`rounded-lg p-2 transition ${favorites.includes(song.id) ? "text-amber-400" : "text-white/30 hover:text-amber-300"}`} aria-label={favorites.includes(song.id) ? "Remove from favorites" : "Add to favorites"} title={favorites.includes(song.id) ? "Remove favorite" : "Add favorite"}>
                      <HeartGlyph filled={favorites.includes(song.id)} />
                    </button>
                  </div>
                )) : <EmptyState text={normalizedQuery ? "No songs match your search." : "No songs available yet."} />
              )}

              {tab === "bands" && (
                filteredBands.length ? filteredBands.slice(0, 30).map((band) => (
                  <button key={band.id} type="button" onClick={() => router.push(`/band/${encodeURIComponent(band.slug)}`)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.04]">
                    {band.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={band.coverImageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    ) : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-amber-400"><UsersGlyph /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{band.name}</span>
                      <span className="mt-1 block truncate text-xs text-white/40">{band.genre || "Band"}</span>
                    </span>
                    <span className="text-xs text-white/30">Open ↗</span>
                  </button>
                )) : <EmptyState text={normalizedQuery ? "No bands match your search." : "No bands available yet."} />
              )}

              {tab === "favorites" && (
                favoriteSongs.length ? favoriteSongs.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.04]">
                    <button type="button" onClick={() => router.push(`/song/${encodeURIComponent(song.slug)}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      {song.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={song.coverImageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                      ) : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-amber-400"><MusicGlyph /></span>}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white">{song.title || "Untitled"}</span>
                        <span className="mt-1 block truncate text-xs text-white/40">{song.artist || "Unknown Artist"}</span>
                      </span>
                    </button>
                    <button type="button" onClick={() => toggleFavorite(song.id)} className="rounded-lg p-2 text-amber-400 transition hover:text-white" aria-label="Remove from favorites" title="Remove favorite"><HeartGlyph filled /></button>
                  </div>
                )) : <EmptyState text="Belum ada favorit. Tekan ikon hati pada lagu untuk menyimpannya di perangkat ini." />
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[10px] text-white/30 sm:px-5">
              <span>Menampilkan maksimal 30 hasil</span>
              <button type="button" onClick={() => { setIsOpen(false); router.push(tab === "bands" ? "/bands" : "/songs"); }} className="font-bold text-amber-400 transition hover:text-amber-300">
                Open full library →
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-12 text-center text-sm text-white/35">{text}</div>;
}

function MusicGlyph() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>;
}

function UsersGlyph() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
