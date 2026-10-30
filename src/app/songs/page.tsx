import Link from "next/link";
import { getPublishedSongs } from "@/lib/songs";
import SongLibrary from "@/components/SongLibrary";

/*
 * =========================================================
 * PAGE CONFIG
 * =========================================================
 *
 * Selalu ambil data terbaru dari database.
 * Ini membantu supaya lagu baru yang ditambahkan
 * dari aplikasi langsung muncul di website.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   ICONS
========================================================= */

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}


/* =========================================================
   PAGE
========================================================= */

export default async function SongsPage() {
  const songs = await getPublishedSongs();

  /*
   * Artist count
   */

  const uniqueArtists = new Set(
    songs
      .map((song) => song.artist?.trim())
      .filter(Boolean)
  ).size;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-zinc-100">

      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-[-260px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400/[0.025] blur-[150px]" />

        <div className="absolute right-[-250px] top-[500px] h-[500px] w-[500px] rounded-full bg-amber-500/[0.018] blur-[130px]" />

        <div className="absolute bottom-[-250px] left-[-200px] h-[450px] w-[450px] rounded-full bg-amber-400/[0.015] blur-[130px]" />
      </div>

      {/* ===================================================
          NAVBAR
      =================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-2xl">

        <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between gap-6 px-5 lg:px-8">

          {/* LOGO */}

          <Link
            href="/"
            className="shrink-0 text-[19px] font-black tracking-[-0.04em] text-white transition hover:text-zinc-300 sm:text-xl"
          >
            M4N
            <span className="text-amber-400">
              {" "}
              MELODIX
            </span>
            <span className="text-zinc-600">
              .
            </span>
          </Link>

          {/* NAV */}

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">

            <Link
              href="/"
              className="py-2 text-zinc-500 transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/songs"
              className="relative py-2 text-white"
            >
              Songs

              <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-amber-400" />
            </Link>

            <Link
              href="/artists"
              className="py-2 text-zinc-500 transition hover:text-white"
            >
              Artists
            </Link>

          </nav>

          {/* RIGHT */}

          <div className="flex items-center gap-2">

            <Link
              href="/songs"
              className="hidden h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-4 text-xs text-zinc-500 transition hover:border-white/[0.15] hover:text-zinc-200 sm:flex"
            >
              <SearchIcon />
              <span>Search songs...</span>
            </Link>

            <Link
              href="/songs"
              aria-label="Search songs"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-zinc-400 transition hover:border-amber-400/30 hover:text-amber-400 sm:hidden"
            >
              <SearchIcon />
            </Link>

          </div>

        </div>
      </header>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:pt-14 lg:px-8 lg:pt-20">

        {/* =================================================
            PAGE INTRO
        ================================================= */}

        <section className="relative mb-10 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#090909] p-7 sm:p-10 lg:p-12">

          {/* Decorative glow */}

          <div className="pointer-events-none absolute right-[-120px] top-[-150px] h-[400px] w-[400px] rounded-full bg-amber-400/[0.045] blur-[100px]" />

          <div className="pointer-events-none absolute bottom-[-180px] left-[25%] h-[350px] w-[350px] rounded-full border border-amber-400/[0.025]" />

          <div className="relative">

            {/* Eyebrow */}

            <div className="mb-5 flex items-center gap-3">

              <span className="h-px w-8 bg-amber-400" />

              <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-amber-400 sm:text-xs">
                M4N Chord Library
              </span>

            </div>

            {/* Title */}

            <h1 className="max-w-3xl text-[46px] font-black leading-[0.95] tracking-[-0.055em] text-white sm:text-6xl lg:text-[76px]">
              Every song.
              <br />

              <span className="text-zinc-500">
                Ready to play.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-sm leading-7 text-zinc-500 sm:text-base">
              Koleksi chord dan lirik yang
              tersedia di M4N Chord.
              Cari lagu, pilih chord, lalu
              mulai bermain.
            </p>

            {/* Stats */}

            <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-5 sm:gap-x-12">

              <div>
                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {songs.length}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Songs
                </p>
              </div>

              <div className="h-8 w-px bg-white/[0.08]" />

              <div>
                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {uniqueArtists}
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Artists
                </p>
              </div>

              <div className="h-8 w-px bg-white/[0.08]" />

              <div>
                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  100%
                </p>

                <p className="mt-1 text-xs text-zinc-600">
                  Free
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* =================================================
            INTERACTIVE SONG LIBRARY
        ================================================= */}

        <SongLibrary songs={songs} />

      </div>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="border-t border-white/[0.05]">

        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">

          <Link
            href="/"
            className="text-sm font-black tracking-tight text-zinc-300"
          >
            M4N{" "}
            <span className="text-amber-400">
              MELODIX
            </span>
            <span className="text-zinc-600">
              .
            </span>
          </Link>

          <p className="text-xs text-zinc-700">
            Chords & lyrics for musicians.
          </p>

        </div>

      </footer>

    </main>
  );
}
