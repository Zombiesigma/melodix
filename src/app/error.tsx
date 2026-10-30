"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Melodix route error:", error); }, [error]);
  return <main className="grid min-h-[70vh] place-items-center bg-[#09090b] px-6 text-white"><div className="max-w-md text-center"><p className="text-xs font-black uppercase tracking-[.35em] text-amber-300">MELODIX / ERROR</p><h1 className="mt-4 text-3xl font-black">Ada yang belum beres.</h1><p className="mt-3 text-sm leading-6 text-white/50">Halaman ini mengalami kendala. Coba muat ulang, atau kembali ke beranda.</p>{error.digest && <p className="mt-3 text-xs text-white/25">Kode: {error.digest}</p>}<div className="mt-7 flex justify-center gap-3"><button onClick={() => reset()} className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-black">Coba lagi</button><Link href="/" className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white/70">Beranda</Link></div></div></main>;
}
