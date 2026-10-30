"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import type { Song } from "@/types/song";

type SongLibraryProps = {
  songs: Song[];
};

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

const controlClass =
  "h-11 w-full rounded-xl border border-white/[0.08] bg-[#0d0d0d] px-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10";

export default function SongLibrary({ songs }: SongLibraryProps) {
  const [search, setSearch] = useState("");
  const [artist, setArtist] = useState("all");
  const [sort, setSort] = useState("newest");

  const artists = useMemo(
    () =>
      Array.from(
        new Set(songs.map((song) => song.artist?.trim()).filter((value): value is string => Boolean(value)))
      ).sort((a, b) => a.localeCompare(b)),
    [songs]
  );

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    const result = songs.filter((song) => {
      const searchable = [
        song.title,
        song.artist,
        song.albumName,
        song.genre,
        song.originalKey,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      const matchesSearch = !query || searchable.includes(query);
      const matchesArtist =
        artist === "all" || (song.artist?.trim() ?? "") === artist;

      return matchesSearch && matchesArtist;
    });

    return result.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "artist") {
        return (a.artist || "Unknown Artist").localeCompare(
          b.artist || "Unknown Artist"
        ) || a.title.localeCompare(b.title);
      }
      return (Number(b.updatedAt ?? b.createdAt ?? 0) -
        Number(a.updatedAt ?? a.createdAt ?? 0));
    });
  }, [songs, search, artist, sort]);

  const hasActiveFilters = search.trim() !== "" || artist !== "all" || sort !== "newest";

  function resetFilters() {
    setSearch("");
    setArtist("all");
    setSort("newest");
  }

  return (
    <section aria-labelledby="song-library-title">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400">
            Library
          </p>
          <h2 id="song-library-title" className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            All songs
          </h2>
          <p className="mt-2 text-xs text-zinc-600">
            Cari berdasarkan judul, artis, album, genre, atau nada dasar.
          </p>
        </div>
        <span className="self-start rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-medium text-zinc-500 sm:self-auto">
          {filteredSongs.length} dari {songs.length} lagu
        </span>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.45fr)_minmax(160px,0.4fr)]">
        <label className="relative block">
          <span className="sr-only">Cari lagu</span>
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-600">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari lagu, artis, album..."
            className={`${controlClass} pl-10 pr-10`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Hapus pencarian"
              className="absolute inset-y-0 right-3 text-xs text-zinc-500 transition hover:text-amber-400"
            >
              ✕
            </button>
          )}
        </label>

        <label>
          <span className="sr-only">Filter artis</span>
          <select value={artist} onChange={(event) => setArtist(event.target.value)} className={controlClass}>
            <option value="all">Semua artis</option>
            {artists.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Urutkan lagu</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className={controlClass}>
            <option value="newest">Terbaru</option>
            <option value="title">Judul A–Z</option>
            <option value="artist">Artis A–Z</option>
          </select>
        </label>
      </div>

      {filteredSongs.length > 0 ? (
        <div className="overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#090909]/80">
          {filteredSongs.map((song, index) => (
            <Link
              key={song.id}
              href={`/song/${encodeURIComponent(song.slug)}`}
              className="group relative flex min-w-0 items-center gap-3 border-b border-white/[0.055] p-3 transition-all duration-300 last:border-b-0 hover:bg-white/[0.025] sm:gap-5 sm:p-4 lg:p-5"
            >
              <div className="absolute bottom-0 left-0 top-0 w-[2px] scale-y-0 bg-amber-400 transition-transform duration-300 group-hover:scale-y-100" />

              <div className="hidden w-7 shrink-0 text-center font-mono text-[10px] font-bold text-zinc-700 sm:block">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[15px] bg-zinc-900 ring-1 ring-white/[0.06] sm:h-[82px] sm:w-[82px]">
                <SafeImage
                  src={song.coverImageUrl}
                  alt={`${song.title} cover`}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] to-black/[0.12]" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-bold tracking-[-0.01em] text-zinc-100 transition group-hover:text-white sm:text-base lg:text-[17px]">
                  {song.title}
                </h3>
                <p className="mt-1 truncate text-xs text-zinc-500 sm:text-sm">
                  {song.artist || "Unknown Artist"}
                </p>
                <div className="mt-2 flex items-center gap-2 sm:hidden">
                  {song.originalKey && (
                    <span className="rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 font-mono text-[9px] font-bold text-zinc-500">
                      {song.originalKey}
                    </span>
                  )}
                  <span className="font-mono text-[9px] text-zinc-700">
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {song.originalKey && (
                <span className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 font-mono text-xs font-bold text-zinc-500 transition group-hover:border-amber-400/20 group-hover:text-amber-400 sm:flex">
                  <MusicIcon />
                  {song.originalKey}
                </span>
              )}

              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.05] text-zinc-700 transition-all duration-300 group-hover:translate-x-1 group-hover:border-amber-400/20 group-hover:text-amber-400 sm:h-10 sm:w-10" aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[#090909] px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.025] text-zinc-600">
            <MusicIcon />
          </div>
          <h2 className="mt-5 text-lg font-bold text-zinc-300">
            {songs.length === 0 ? "Belum ada lagu" : "Lagu tidak ditemukan"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            {songs.length === 0
              ? "Belum ada lagu published di database."
              : "Coba kata kunci lain atau ubah filter artis untuk menemukan lagu yang kamu cari."}
          </p>
          {songs.length > 0 && hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 rounded-full border border-amber-400/25 bg-amber-400/[0.07] px-4 py-2.5 text-xs font-bold text-amber-400 transition hover:bg-amber-400/[0.13]"
            >
              Reset pencarian dan filter
            </button>
          )}
        </div>
      )}

      {songs.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.05] pt-6 text-xs text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <p>Menampilkan {filteredSongs.length} dari {songs.length} lagu</p>
          <Link href="/" className="flex items-center gap-2 transition hover:text-zinc-400">
            Back to home
            <ArrowIcon />
          </Link>
        </div>
      )}
    </section>
  );
}
