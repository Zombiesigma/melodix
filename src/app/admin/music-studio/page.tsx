"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp,
  updateDoc, where, limit
} from "firebase/firestore";
import {
  ArrowLeft, BadgeCheck, Disc3, FileMusic, LoaderCircle, LogOut, Music2,
  Save, Send, ShieldAlert, Sparkles
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import GitHubImageUpload from "@/components/GitHubImageUpload";

type BandOption = { id: string; name: string; slug?: string; isPublished?: boolean };
type DraftSong = {
  id: string; title: string; artist: string; bandId?: string; isPublished?: boolean;
  updatedAt?: unknown; status?: string;
};

const inputClass = "w-full rounded-xl border border-white/10 bg-[#090909] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-300/70";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55";

function makeSlug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `song-${Date.now()}`;
}

export default function AdminMusicStudioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [bands, setBands] = useState<BandOption[]>([]);
  const [drafts, setDrafts] = useState<DraftSong[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [bandId, setBandId] = useState("");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [genre, setGenre] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [capo, setCapo] = useState("");
  const [albumName, setAlbumName] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [writers, setWriters] = useState("");
  const [composers, setComposers] = useState("");
  const [arrangers, setArrangers] = useState("");
  const [description, setDescription] = useState("");

  const selectedBand = useMemo(() => bands.find(b => b.id === bandId), [bands, bandId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async current => {
      setUser(current);
      if (!current) {
        setAuthorized(false);
        setChecking(false);
        router.replace("/login?next=/admin/music-studio");
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, "admins", current.uid));
        setAuthorized(adminDoc.exists() && adminDoc.data()?.active === true);
      } catch {
        setAuthorized(false);
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    async function load() {
      setLoadingData(true);
      setError("");
      try {
        const bandSnap = await getDocs(query(collection(db, "bands"), limit(200)));
        const bandList = bandSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, name: String(data.name || "Band tanpa nama"), slug: data.slug, isPublished: data.isPublished === true };
        }).sort((a,b) => a.name.localeCompare(b.name));
        const songSnap = await getDocs(query(collection(db, "songs"), orderBy("updatedAt", "desc"), limit(30)));
        const songList = songSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, title: String(data.title || "Tanpa judul"), artist: String(data.artist || ""), bandId: typeof data.bandId === "string" ? data.bandId : undefined, isPublished: data.isPublished === true, status: String(data.status || (data.isPublished ? "published" : "draft")), updatedAt: data.updatedAt };
        });
        if (!cancelled) {
          setBands(bandList);
          setDrafts(songList);
          if (!bandId && bandList[0]) setBandId(bandList[0].id);
        }
      } catch (e) {
        if (!cancelled) setError("Gagal memuat data. Periksa Firestore Rules dan indeks, lalu coba muat ulang.");
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authorized]);

  async function saveSong(e: FormEvent<HTMLFormElement>, publish: boolean) {
    e.preventDefault();
    if (!selectedBand) { setError("Pilih band tujuan terlebih dahulu."); return; }
    if (!title.trim() || !lyrics.trim()) { setError("Judul dan lirik/chord wajib diisi."); return; }
    setBusy(true); setError(""); setNotice("");
    const slug = makeSlug(`${selectedBand.name}-${title}`);
    try {
      const payload = {
        title: title.trim(),
        slug,
        artist: selectedBand.name,
        bandId: selectedBand.id,
        bandSlug: selectedBand.slug || "",
        lyricsWithChords: lyrics.trim(),
        genre: genre.trim(),
        originalKey: key.trim(),
        bpm: bpm ? Number(bpm) : null,
        capo: capo ? Number(capo) : null,
        albumName: albumName.trim(),
        coverImageUrl: coverImageUrl.trim(),
        releaseDate: releaseDate || "",
        writers: writers.trim(),
        composers: composers.trim(),
        arrangers: arrangers.trim(),
        description: description.trim(),
        createdBy: user?.uid || "",
        createdByEmail: user?.email || "",
        createdByRole: "admin",
        isPublished: publish,
        status: publish ? "published" : "draft",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "songs"), payload);
      setDrafts(old => [{ id: ref.id, title: title.trim(), artist: selectedBand.name, bandId: selectedBand.id, isPublished: publish, status: publish ? "published" : "draft" }, ...old].slice(0,30));
      setNotice(publish ? `Lagu diterbitkan dan ditautkan ke profil ${selectedBand.name}.` : `Draft lagu tersimpan untuk ${selectedBand.name}.`);
      setTitle(""); setLyrics(""); setGenre(""); setKey(""); setBpm(""); setCapo("");
      setAlbumName(""); setCoverImageUrl(""); setReleaseDate(""); setWriters(""); setComposers(""); setArrangers(""); setDescription("");
    } catch (e) {
      setError("Gagal menyimpan lagu. Pastikan Firestore Rules mengizinkan admin dan dokumen admins/{UID} sudah benar.");
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft(song: DraftSong) {
    if (!song.id) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await updateDoc(doc(db, "songs", song.id), { isPublished: true, status: "published", updatedAt: serverTimestamp(), publishedBy: user?.uid || "" });
      setDrafts(old => old.map(s => s.id === song.id ? { ...s, isPublished: true, status: "published" } : s));
      setNotice(`“${song.title}” berhasil diterbitkan.`);
    } catch {
      setError("Tidak dapat menerbitkan draft. Periksa Firestore Rules.");
    } finally { setBusy(false); }
  }

  if (checking) return <main className="min-h-screen bg-[#090909] text-white grid place-items-center"><LoaderCircle className="animate-spin text-amber-300" /></main>;
  if (!authorized) return <main className="min-h-screen bg-[#090909] px-5 py-20 text-white"><div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#111] p-7"><ShieldAlert className="mb-4 text-amber-300" size={32}/><h1 className="text-2xl font-black">Akses admin diperlukan</h1><p className="mt-2 text-sm leading-6 text-white/55">Akun ini belum terdaftar sebagai admin pada dokumen <code>admins/{user?.uid || "UID"}</code>. Halaman ini tidak memberi hak admin otomatis.</p><Link href="/" className="mt-6 inline-block rounded-xl bg-amber-300 px-4 py-3 font-bold text-black">Kembali ke Melodix</Link></div></main>;

  return <main className="min-h-screen bg-[#090909] text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090909]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3"><Link href="/admin/band-applications" className="rounded-xl border border-white/10 p-2 text-white/60 hover:text-white"><ArrowLeft size={18}/></Link><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-300">MELODIX / ADMIN</p><h1 className="text-lg font-black sm:text-xl">Music Studio</h1></div></div>
        <button onClick={async()=>{await signOut(auth);router.replace("/login");}} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/60 hover:text-white"><LogOut size={15}/> Keluar</button>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
      <section className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-[#111] p-5 sm:p-7">
          <div className="mb-6 flex items-start gap-3"><div className="rounded-2xl bg-amber-300 p-3 text-black"><FileMusic size={23}/></div><div><p className="text-xs font-bold uppercase tracking-widest text-amber-300">Create & publish</p><h2 className="mt-1 text-2xl font-black">Buat lagu untuk band</h2><p className="mt-1 text-sm text-white/50">Lagu akan ditautkan ke katalog band yang kamu pilih.</p></div></div>
          <form onSubmit={e=>void saveSong(e,false)} className="space-y-5">
            <div><label className={labelClass}>Band tujuan *</label><select required value={bandId} onChange={e=>setBandId(e.target.value)} className={inputClass}><option value="">Pilih band</option>{bands.map(b=><option key={b.id} value={b.id}>{b.name}{b.isPublished?"":" (belum tayang)"}</option>)}</select>{bands.length===0&&<p className="mt-2 text-xs text-amber-200">Belum ada dokumen band di Firestore.</p>}</div>
            <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Judul lagu *</label><input required value={title} onChange={e=>setTitle(e.target.value)} className={inputClass} placeholder="Contoh: Hands"/></div><div><label className={labelClass}>Genre</label><input value={genre} onChange={e=>setGenre(e.target.value)} className={inputClass} placeholder="Alternative rock"/></div></div>
            <div><label className={labelClass}>Lirik + chord *</label><textarea required value={lyrics} onChange={e=>setLyrics(e.target.value)} rows={12} className={`${inputClass} resize-y font-mono leading-7`} placeholder={"[Verse 1]\n[Em]I keep the lights on...\n[C]Waiting for the morning...\n\n[Chorus]\n[G]... [D]..."} /><p className="mt-2 text-xs text-white/35">Gunakan format chord yang dipakai Melodix, misalnya [Em], [C], [G], [D].</p></div>
            <div className="grid gap-4 sm:grid-cols-3"><div><label className={labelClass}>Nada dasar</label><input value={key} onChange={e=>setKey(e.target.value)} className={inputClass} placeholder="Em"/></div><div><label className={labelClass}>BPM</label><input type="number" min="1" max="400" value={bpm} onChange={e=>setBpm(e.target.value)} className={inputClass} placeholder="124"/></div><div><label className={labelClass}>Capo fret</label><input type="number" min="0" max="24" value={capo} onChange={e=>setCapo(e.target.value)} className={inputClass} placeholder="0"/></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Album</label><input value={albumName} onChange={e=>setAlbumName(e.target.value)} className={inputClass} placeholder="Nama album / single"/></div><div><label className={labelClass}>Tanggal rilis</label><input type="date" value={releaseDate} onChange={e=>setReleaseDate(e.target.value)} className={inputClass}/></div></div>
            <GitHubImageUpload label="Cover lagu" kind="song-cover" bandId={bandId || undefined} value={coverImageUrl} onChange={setCoverImageUrl}/>
            <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Penulis lirik</label><input value={writers} onChange={e=>setWriters(e.target.value)} className={inputClass} placeholder="Nama pencipta lirik"/></div><div><label className={labelClass}>Komposer musik</label><input value={composers} onChange={e=>setComposers(e.target.value)} className={inputClass} placeholder="Nama pencipta musik"/></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>Aransemen</label><input value={arrangers} onChange={e=>setArrangers(e.target.value)} className={inputClass} placeholder="Nama arranger"/></div><div><label className={labelClass}>Deskripsi / catatan</label><input value={description} onChange={e=>setDescription(e.target.value)} className={inputClass} placeholder="Catatan lagu (opsional)"/></div></div>
            {error&&<p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            {notice&&<p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p>}
            <div className="grid gap-3 sm:grid-cols-2"><button type="submit" disabled={busy||!bands.length} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3.5 font-bold hover:bg-white/5 disabled:opacity-50"><Save size={17}/>{busy?"Menyimpan...":"Simpan sebagai draft"}</button><button type="button" disabled={busy||!bands.length} onClick={e=>{const form=e.currentTarget.form;if(form) void saveSong({preventDefault:()=>{},currentTarget:form} as unknown as FormEvent<HTMLFormElement>,true);}} className="flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3.5 font-black text-black hover:bg-amber-200 disabled:opacity-50"><Send size={17}/>Terbitkan sekarang</button></div>
            <p className="text-xs leading-5 text-white/35">Pastikan izin penggunaan dan kredit pencipta sudah benar sebelum menerbitkan. Admin yang menginput lagu tidak otomatis menjadi pencipta.</p>
          </form>
        </div>
      </section>
      <aside className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-[#111] p-5"><div className="flex items-center gap-2"><Disc3 className="text-amber-300"/><h2 className="font-black">Lagu terbaru</h2></div><p className="mt-1 text-xs text-white/45">Draft dan lagu yang sudah terbit</p>
          {loadingData?<div className="flex justify-center py-8"><LoaderCircle className="animate-spin text-amber-300"/></div>:drafts.length===0?<p className="py-8 text-center text-sm text-white/35">Belum ada lagu.</p>:<div className="mt-4 space-y-2">{drafts.map(s=><div key={s.id} className="rounded-2xl border border-white/8 bg-black/20 p-3"><div className="flex items-start gap-3"><div className="rounded-xl bg-white/5 p-2 text-amber-300"><Music2 size={18}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{s.title}</p><p className="mt-1 truncate text-xs text-white/45">{s.artist}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${s.isPublished?"bg-emerald-400/10 text-emerald-300":"bg-amber-300/10 text-amber-200"}`}>{s.isPublished?"Terbit":"Draft"}</span></div></div>{!s.isPublished&&<button disabled={busy} onClick={()=>void publishDraft(s)} className="mt-3 w-full rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-300/10">Terbitkan draft</button>}</div>)}</div>}
        </div>
        <div className="rounded-3xl border border-amber-300/15 bg-amber-300/[.04] p-5"><div className="flex items-center gap-2 text-amber-200"><BadgeCheck size={18}/><h3 className="font-bold">Kredit yang transparan</h3></div><p className="mt-2 text-sm leading-6 text-white/50">Isi penulis lirik, komposer, dan arranger berdasarkan informasi yang benar. Simpan draft jika kredit atau izin publikasi belum dikonfirmasi.</p></div>
      </aside>
    </div>
  </main>;
}
