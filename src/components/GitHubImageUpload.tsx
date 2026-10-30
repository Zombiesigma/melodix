"use client";
import { useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { ImagePlus, LoaderCircle, X } from "lucide-react";

type Props = { label: string; kind: "song-cover" | "album-cover" | "band-logo" | "band-cover"; bandId?: string; value: string; onChange: (url: string) => void; hint?: string };
export default function GitHubImageUpload({ label, kind, bandId, value, onChange, hint }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!auth.currentUser) { setError("Silakan login kembali sebelum mengunggah."); return; }
    setBusy(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const body = new FormData(); body.append("file", file); body.append("kind", kind); if (bandId) body.append("bandId", bandId);
      const response = await fetch("/api/media/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload gagal.");
      onChange(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Upload gagal."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <div className="space-y-2">
    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">{label}</label>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-white/30">{value ? <img src={value} alt="Preview" className="h-full w-full object-cover"/> : <ImagePlus size={22}/>}</div>
      <div className="min-w-0 flex-1"><p className="truncate text-xs text-white/55">{value ? "Gambar sudah dipilih" : "Belum ada gambar"}</p><p className="mt-1 text-[10px] text-white/30">JPG, PNG, WEBP atau AVIF · Maks. 4 MB</p><div className="mt-2 flex gap-2"><button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-black disabled:opacity-50">{busy ? <><LoaderCircle size={13} className="mr-1 inline animate-spin"/> Mengunggah...</> : "Pilih gambar"}</button>{value && <button type="button" disabled={busy} onClick={() => onChange("")} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55"><X size={13} className="mr-1 inline"/> Hapus pilihan</button>}</div></div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={e => void upload(e.target.files?.[0])}/>
    </div>
    {hint && <p className="text-[10px] text-white/30">{hint}</p>}{error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>;
}
