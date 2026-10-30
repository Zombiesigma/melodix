import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Music2 } from "lucide-react";

import type { Band } from "@/types/band";

interface BandCardProps {
  band: Band;
  songCount?: number;
}

export default function BandCard({
  band,
  songCount = 0,
}: BandCardProps) {
  return (
    <Link
      href={`/band/${band.slug}`}
      className="group block"
    >
      <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400/40 hover:bg-white/[0.055]">
        {/* IMAGE */}
        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
          {band.coverImageUrl ? (
            <Image
              src={band.coverImageUrl}
              alt={band.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : band.logoUrl ? (
            <div className="flex h-full items-center justify-center p-10">
              <Image
                src={band.logoUrl}
                alt={band.name}
                width={260}
                height={160}
                className="max-h-32 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <Music2 className="h-12 w-12 text-white/20" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

          <div className="absolute left-4 top-4">
            <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
              BAND
            </span>
          </div>

          <div className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-black transition-transform duration-300 group-hover:rotate-45">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-black tracking-tight text-white">
                {band.name}
              </h3>

              <p className="mt-1 text-sm text-white/50">
                {band.genre || "Music Artist"}
              </p>
            </div>

            {songCount > 0 && (
              <div className="shrink-0 text-right">
                <div className="text-lg font-black text-yellow-400">
                  {songCount}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                  Songs
                </div>
              </div>
            )}
          </div>

          {(band.origin || band.formedYear) && (
            <div className="mt-4 flex gap-2 text-xs text-white/40">
              {band.origin && <span>{band.origin}</span>}

              {band.origin && band.formedYear && (
                <span>•</span>
              )}

              {band.formedYear && (
                <span>Est. {band.formedYear}</span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
