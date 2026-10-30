import Link from "next/link";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-[#09090b] px-6 text-white">
    <div className="max-w-md text-center">
      <p className="text-xs font-black uppercase tracking-[.35em] text-amber-300">MELODIX / 404</p>
      <h1 className="mt-4 text-5xl font-black tracking-tight">Nada yang hilang.</h1>
      <p className="mt-4 text-sm leading-6 text-white/50">Halaman yang kamu cari tidak tersedia, mungkin sudah dipindahkan atau belum dipublikasikan.</p>
      <div className="mt-8 flex justify-center gap-3"><Link href="/" className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-black">Kembali ke beranda</Link><Link href="/songs" className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white/70">Jelajahi lagu</Link></div>
    </div>
  </main>;
}
