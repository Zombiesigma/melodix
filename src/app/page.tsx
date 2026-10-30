import Link from "next/link";
import { getPublishedSongs } from "@/lib/songs";
import { getPublishedBands } from "@/lib/bands";
import SafeImage from "@/components/SafeImage";
import HomeQuickActions from "@/components/HomeQuickActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   ICONS
========================================================= */

function ArrowIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function MusicIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

function UsersIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function DiscIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v7" />
      <path d="M21 12h-7" />
      <path d="M12 21v-7" />
      <path d="M3 12h7" />
    </svg>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatArtistName(name?: string) {
  return name?.trim() || "Unknown Artist";
}

function formatSongTitle(title?: string) {
  return title?.trim() || "Untitled";
}

/* =========================================================
   PAGE
========================================================= */

export default async function HomePage() {
  const [songs, bands] = await Promise.all([
    getPublishedSongs(),
    getPublishedBands(),
  ]);

  const featuredSongs = songs.slice(0, 4);
  const latestSongs = songs.slice(0, 9);

  /*
   * Hitung jumlah lagu per band dari data songs yang sudah
   * kita ambil. Jadi Home tidak perlu melakukan query
   * Firestore tambahan untuk setiap band.
   */
  const songCountByArtist = new Map<string, number>();
  const firstCoverByArtist = new Map<string, string>();

  for (const song of songs) {
    const artist = song.artist?.trim();

    if (!artist) continue;

    songCountByArtist.set(
      artist,
      (songCountByArtist.get(artist) ?? 0) + 1
    );

    if (
      !firstCoverByArtist.has(artist) &&
      song.coverImageUrl
    ) {
      firstCoverByArtist.set(artist, song.coverImageUrl);
    }
  }

  /*
   * Ambil maksimal 8 band untuk section homepage.
   */
  const bandsWithSongs = bands.slice(0, 8).map((band) => ({
    band,
    cover:
      band.coverImageUrl ||
      firstCoverByArtist.get(band.name) ||
      band.logoUrl ||
      "",
    count: songCountByArtist.get(band.name) ?? 0,
  }));

  const heroSong = songs[0];

  return (
    <main className="min-h-screen bg-black text-white">
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-black shadow-[0_0_25px_rgba(251,191,36,0.2)]">
              <MusicIcon className="h-5 w-5" />
            </div>

            <div className="leading-none">
              <div className="text-lg font-black tracking-tight">
                MELODIX
                <span className="text-amber-400">.</span>
              </div>

              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.25em] text-white/35">
                Music Archive
              </div>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              href="/"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5 hover:text-amber-300"
            >
              Home
            </Link>

            <Link
              href="/songs"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              Songs
            </Link>

            <Link
              href="/bands"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              Bands
            </Link>
          </nav>

          {/* Interactive tools: live search, favorites, and random song */}
          <HomeQuickActions
            songs={songs.map((song) => ({
              id: song.id,
              slug: song.slug,
              title: song.title,
              artist: song.artist ?? "",
              coverImageUrl: song.coverImageUrl ?? "",
              originalKey: song.originalKey ?? "",
            }))}
            bands={bands.map((band) => ({
              id: band.id,
              slug: band.slug,
              name: band.name,
              genre: band.genre ?? "",
              coverImageUrl: band.coverImageUrl ?? band.logoUrl ?? "",
            }))}
          />
        </div>
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden border-b border-white/10">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl" />

          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Hero Copy */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                Guitar Chords Archive
              </div>

              <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-8xl">
                PLAY THE
                <br />
                <span className="text-amber-400">MUSIC.</span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-white/50 sm:text-lg">
                Chord, lyrics, and music from the bands you love.
                Discover songs, learn the chords, and play them your
                way.
              </p>

              {/* CTA */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/songs"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-black transition hover:bg-amber-300"
                >
                  Browse Songs
                  <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href="/bands"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  Explore Bands
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-5 border-t border-white/10 pt-7">
                <div>
                  <div className="text-2xl font-black">
                    {songs.length}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                    Songs
                  </div>
                </div>

                <div className="h-10 w-px bg-white/10" />

                <div>
                  <div className="text-2xl font-black">
                    {bands.length}
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                    Bands
                  </div>
                </div>

                <div className="h-10 w-px bg-white/10" />

                <div>
                  <div className="text-2xl font-black text-amber-400">
                    FREE
                  </div>
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
                    Always
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Song */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-amber-400/5 blur-2xl" />

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
                {heroSong?.coverImageUrl ? (
                  <div className="relative aspect-[4/3]">
                    <SafeImage
                      src={heroSong.coverImageUrl}
                      alt={formatSongTitle(heroSong.title)}
                      fill
                      className="object-cover opacity-80"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                        Featured Song
                      </div>

                      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                        {formatSongTitle(heroSong.title)}
                      </h2>

                      <p className="mt-2 text-sm text-white/50">
                        {formatArtistName(heroSong.artist)}
                      </p>

                      <Link
                        href={`/song/${encodeURIComponent(
                          heroSong.slug
                        )}`}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-xs font-bold backdrop-blur transition hover:bg-amber-400 hover:text-black"
                      >
                        View Chords
                        <ArrowIcon className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                    <div className="text-center">
                      <MusicIcon className="mx-auto h-10 w-10 text-amber-400/50" />
                      <p className="mt-4 text-sm text-white/30">
                        Your next song starts here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FEATURED SONGS
      ===================================================== */}

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                Handpicked
              </div>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Featured Songs
              </h2>
            </div>

            <Link
              href="/songs"
              className="group hidden items-center gap-2 text-xs font-bold text-white/40 transition hover:text-amber-300 sm:flex"
            >
              View all
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {featuredSongs.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featuredSongs.map((song, index) => (
                <Link
                  key={song.id}
                  href={`/song/${encodeURIComponent(song.slug)}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:-translate-y-1 hover:border-amber-400/30 hover:bg-zinc-900"
                >
                  <div className="relative aspect-square overflow-hidden bg-zinc-900">
                    {song.coverImageUrl ? (
                      <SafeImage
                        src={song.coverImageUrl}
                        alt={formatSongTitle(song.title)}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                        <MusicIcon className="h-8 w-8 text-white/10" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <div className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-[10px] font-black text-white/50 backdrop-blur">
                      0{index + 1}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="truncate text-lg font-black">
                        {formatSongTitle(song.title)}
                      </h3>

                      <p className="mt-1 truncate text-xs text-white/45">
                        {formatArtistName(song.artist)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">
                      {song.originalKey || "—"}
                    </span>

                    <ArrowIcon className="h-4 w-4 text-white/20 transition group-hover:translate-x-1 group-hover:text-amber-400" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
              <MusicIcon className="mx-auto h-8 w-8 text-white/10" />

              <p className="mt-4 text-sm text-white/30">
                No songs available yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          LATEST SONGS
      ===================================================== */}

      <section className="border-b border-white/10 bg-zinc-950/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                Recently Added
              </div>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Latest Songs
              </h2>
            </div>

            <Link
              href="/songs"
              className="group hidden items-center gap-2 text-xs font-bold text-white/40 transition hover:text-amber-300 sm:flex"
            >
              Browse library
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {latestSongs.length > 0 ? (
            <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-black">
              {latestSongs.map((song, index) => (
                <Link
                  key={song.id}
                  href={`/song/${encodeURIComponent(song.slug)}`}
                  className="group flex items-center gap-4 px-4 py-4 transition hover:bg-white/[0.025] sm:px-5"
                >
                  {/* Number */}
                  <div className="w-7 shrink-0 text-center text-xs font-bold text-white/20">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  {/* Cover */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                    {song.coverImageUrl ? (
                      <SafeImage
                        src={song.coverImageUrl}
                        alt={formatSongTitle(song.title)}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <MusicIcon className="h-4 w-4 text-white/15" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-white transition group-hover:text-amber-300 sm:text-base">
                      {formatSongTitle(song.title)}
                    </h3>

                    <p className="mt-1 truncate text-xs text-white/35">
                      {formatArtistName(song.artist)}
                    </p>
                  </div>

                  {/* Key */}
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">
                      Key
                    </div>

                    <div className="mt-1 text-xs font-bold text-white/50">
                      {song.originalKey || "—"}
                    </div>
                  </div>

                  {/* BPM */}
                  <div className="hidden w-16 shrink-0 text-right md:block">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/20">
                      BPM
                    </div>

                    <div className="mt-1 text-xs font-bold text-white/50">
                      {song.bpm || "—"}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowIcon className="h-4 w-4 shrink-0 text-white/15 transition group-hover:translate-x-1 group-hover:text-amber-400" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
              <MusicIcon className="mx-auto h-8 w-8 text-white/10" />

              <p className="mt-4 text-sm text-white/30">
                No songs available yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          TOP BANDS
      ===================================================== */}

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400">
                <UsersIcon className="h-3.5 w-3.5" />
                Artists & Bands
              </div>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Top Bands
              </h2>
            </div>

            <Link
              href="/bands"
              className="group hidden items-center gap-2 text-xs font-bold text-white/40 transition hover:text-amber-300 sm:flex"
            >
              View all bands
              <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {bandsWithSongs.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {bandsWithSongs.map(({ band, cover, count }) => (
                <Link
                  key={band.id}
                  href={`/band/${encodeURIComponent(band.slug)}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:-translate-y-1 hover:border-amber-400/30"
                >
                  {/* Cover */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
                    {cover ? (
                      <SafeImage
                        src={cover}
                        alt={band.name}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
                        {band.logoUrl ? (
                          <div className="relative h-20 w-20">
                            <SafeImage
                              src={band.logoUrl}
                              alt={band.name}
                              fill
                              className="object-contain opacity-80"
                            />
                          </div>
                        ) : (
                          <UsersIcon className="h-9 w-9 text-white/10" />
                        )}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="truncate text-base font-black sm:text-lg">
                        {band.name}
                      </h3>

                      {band.genre && (
                        <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                          {band.genre}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                      <DiscIcon className="h-3.5 w-3.5" />

                      {count} {count === 1 ? "Song" : "Songs"}
                    </div>

                    <ArrowIcon className="h-4 w-4 text-white/15 transition group-hover:translate-x-1 group-hover:text-amber-400" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
              <UsersIcon className="mx-auto h-8 w-8 text-white/10" />

              <p className="mt-4 text-sm text-white/30">
                No bands available yet.
              </p>

              <Link
                href="/bands"
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-xs font-bold text-white/50 transition hover:border-amber-400/30 hover:text-amber-300"
              >
                Explore Bands
                <ArrowIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          CTA
      ===================================================== */}

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-amber-400/[0.03]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-amber-400/15 bg-gradient-to-br from-amber-400/[0.08] via-transparent to-transparent px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
                <MusicIcon className="h-6 w-6" />
              </div>

              <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
                Ready to play?
              </h2>

              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/40">
                Find your favorite song, grab your guitar, and
                start playing.
              </p>

              <Link
                href="/songs"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-6 py-3.5 text-sm font-black text-black transition hover:bg-amber-300"
              >
                Explore Songs
                <ArrowIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <div className="text-sm font-black tracking-tight">
              MELODIX
              <span className="text-amber-400">.</span>
            </div>

            <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/20">
              Music Archive
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-white/30">
            <Link
              href="/"
              className="transition hover:text-white"
            >
              Home
            </Link>

            <Link
              href="/songs"
              className="transition hover:text-white"
            >
              Songs
            </Link>

            <Link
              href="/bands"
              className="transition hover:text-white"
            >
              Bands
            </Link>
          </div>

          <div className="text-[10px] uppercase tracking-[0.15em] text-white/15">
            © {new Date().getFullYear()} Chord
          </div>
        </div>
      </footer>
    </main>
  );
}
