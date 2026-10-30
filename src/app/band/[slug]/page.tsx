import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Instagram,
  Music2,
  Play,
  Youtube,
} from "lucide-react";

import {
  getBandBySlug,
  getSongsByBand,
} from "@/lib/bands";

export const dynamic = "force-dynamic";

export default async function BandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const band = await getBandBySlug(slug);

  if (!band) {
    notFound();
  }

  const songs = await getSongsByBand(band.id, band.name);

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-yellow-400/[0.035] blur-[160px]" />
      </div>

      {/* TOP NAV */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/bands"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 transition hover:text-yellow-400"
          >
            <ArrowLeft className="h-4 w-4" />
            All Bands
          </Link>

          <span className="text-xs font-black tracking-[0.3em] text-yellow-400">
            M4N
          </span>
        </div>
      </div>

      {/* HERO */}
      <section className="relative pt-16">
        <div className="relative min-h-[520px] overflow-hidden">
          {band.coverImageUrl && (
            <Image
              src={band.coverImageUrl}
              alt={band.name}
              fill
              priority
              className="object-cover opacity-45"
              sizes="100vw"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/65 to-black" />

          <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-end px-5 pb-12 sm:px-8 sm:pb-16">
            <div className="w-full">
              {/* LOGO */}
              {band.logoUrl && (
                <div className="mb-8">
                  <Image
                    src={band.logoUrl}
                    alt={`${band.name} logo`}
                    width={260}
                    height={140}
                    className="max-h-28 w-auto object-contain object-left"
                  />
                </div>
              )}

              <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-yellow-400">
                BAND PROFILE
              </p>

              <h1 className="max-w-5xl text-6xl font-black tracking-[-0.06em] sm:text-8xl lg:text-9xl">
                {band.name}
              </h1>

              <div className="mt-5 flex flex-wrap gap-2">
                {band.genre && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70">
                    {band.genre}
                  </span>
                )}

                {band.origin && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70">
                    {band.origin}
                  </span>
                )}

                {band.formedYear && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70">
                    Est. {band.formedYear}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          {/* LEFT */}
          <div>
            {/* ABOUT */}
            {band.description && (
              <section className="border-t border-white/10 py-10">
                <p className="mb-5 text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                  ABOUT
                </p>

                <p className="max-w-3xl text-lg leading-8 text-white/65 sm:text-xl">
                  {band.description}
                </p>
              </section>
            )}

            {/* SONGS */}
            <section className="border-t border-white/10 py-10">
              <div className="mb-7 flex items-end justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                    CHORDS &amp; LYRICS
                  </p>

                  <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                    {songs.length} SONGS
                  </h2>
                </div>
              </div>

              {songs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
                  Belum ada lagu dari band ini.
                </div>
              ) : (
                <div className="divide-y divide-white/10 border-y border-white/10">
                  {songs.map((song, index) => (
                    <Link
                      key={song.id}
                      href={`/song/${encodeURIComponent(song.slug)}`}
                      className="group flex items-center gap-4 py-5 transition hover:bg-white/[0.025]"
                    >
                      <span className="w-8 shrink-0 font-mono text-xs text-white/25">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      {song.coverImageUrl && (
                        <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-900 sm:block">
                          <Image
                            src={song.coverImageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-bold transition group-hover:text-yellow-400 sm:text-lg">
                          {song.title}
                        </h3>

                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-white/30">
                          {song.originalKey && (
                            <span>Key {song.originalKey}</span>
                          )}

                          {(song.bpm ?? 0) > 0 && (
                            <>
                              <span>•</span>
                              <span>{song.bpm} BPM</span>
                            </>
                          )}
                        </div>
                      </div>

                      <ArrowUpRight className="h-5 w-5 shrink-0 text-white/20 transition group-hover:text-yellow-400" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* MEMBERS */}
            {band.members && band.members.length > 0 && (
              <section className="border-t border-white/10 py-10">
                <p className="mb-6 text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                  MEMBERS
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {band.members.map((member) => (
                    <div
                      key={`${member.name}-${member.role}`}
                      className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4"
                    >
                      {member.photoUrl ? (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src={member.photoUrl}
                            alt={member.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/5">
                          <Music2 className="h-5 w-5 text-yellow-400" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="font-bold text-white">
                          {member.name}
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="lg:pt-10">
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <p className="mb-5 text-xs font-black uppercase tracking-[0.25em] text-yellow-400">
                CONNECT
              </p>

              <div className="space-y-2">
                {band.spotifyUrl && (
                  <a
                    href={band.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-bold transition hover:border-yellow-400/30 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3">
                      <Play className="h-4 w-4" />
                      Spotify
                    </span>

                    <ExternalLink className="h-4 w-4 text-white/30" />
                  </a>
                )}

                {band.youtubeUrl && (
                  <a
                    href={band.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-bold transition hover:border-yellow-400/30 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3">
                      <Youtube className="h-4 w-4" />
                      YouTube
                    </span>

                    <ExternalLink className="h-4 w-4 text-white/30" />
                  </a>
                )}

                {band.instagramUrl && (
                  <a
                    href={band.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-bold transition hover:border-yellow-400/30 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-3">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </span>

                    <ExternalLink className="h-4 w-4 text-white/30" />
                  </a>
                )}

                {band.websiteUrl && (
                  <a
                    href={band.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-bold transition hover:border-yellow-400/30 hover:bg-white/5"
                  >
                    <span>Official Website</span>

                    <ExternalLink className="h-4 w-4 text-white/30" />
                  </a>
                )}
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-white/30">
                    Chords available
                  </span>

                  <span className="text-xl font-black text-yellow-400">
                    {songs.length}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
