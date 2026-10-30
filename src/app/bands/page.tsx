import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import BandCard from "@/components/BandCard";
import {
  getPublishedBands,
  getSongsByBand,
} from "@/lib/bands";

export const dynamic = "force-dynamic";

export default async function BandsPage() {
  const bands = await getPublishedBands();

  const bandsWithSongs = await Promise.all(
    bands.map(async (band) => {
      const songs = await getSongsByBand(band.id, band.name);

      return {
        band,
        songCount: songs.length,
      };
    })
  );

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-yellow-400/[0.04] blur-[140px]" />
      </div>

      {/* HEADER */}
      <section className="border-b border-white/10 pt-28">
        <div className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 transition hover:text-yellow-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back Home
          </Link>

          <div className="max-w-4xl">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-yellow-400">
              ARTISTS & BANDS
            </p>

            <h1 className="text-5xl font-black tracking-[-0.05em] sm:text-7xl lg:text-8xl">
              THE
              <br />
              <span className="text-yellow-400">BANDS.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-white/50 sm:text-lg">
              Temukan band dan artist yang lagu serta chord-nya
              tersedia di M4N.
            </p>
          </div>
        </div>
      </section>

      {/* BAND GRID */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        {bandsWithSongs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-24 text-center">
            <p className="text-sm text-white/40">
              Belum ada band yang dipublikasikan.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {bandsWithSongs.map(({ band, songCount }) => (
              <BandCard
                key={band.id}
                band={band}
                songCount={songCount}
              />
            ))}
          </div>
        )}
      </section>

      {/* FOOTER CTA */}
      <section className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
              M4N
            </p>

            <p className="mt-2 text-sm text-white/40">
              Chords, lyrics &amp; music archive.
            </p>
          </div>

          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-sm font-bold uppercase tracking-widest"
          >
            Back to home
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </main>
  );
}
