"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, updateDoc, where, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ArrowLeft, BadgeCheck, Check, CircleAlert, ExternalLink, LoaderCircle, LogOut, Music2, ShieldCheck, X } from "lucide-react";

type Application = { id: string; ownerUid: string; ownerEmail?: string; bandName: string; slug: string; genre?: string; origin?: string; description?: string; contactEmail?: string; instagramUrl?: string; status: string; reviewNote?: string; createdAt?: unknown };
type SongReview = { id: string; ownerUid: string; bandId: string; artist?: string; title: string; slug: string; lyricsWithChords?: string; originalKey?: string; bpm?: number; capo?: number; status: string; isPublished: boolean };
const input = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/50";

export default function BandApplicationsAdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [songs, setSongs] = useState<SongReview[]>([]);
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [filter, setFilter] = useState<"applications" | "songs">("applications");

  useEffect(() => onAuthStateChanged(auth, async u => {
    setUser(u); setAuthReady(true); setIsAdmin(false); setApplications([]); setSongs([]);
    if (u) {
      try {
        // Admin membership is stored at admins/{UID}.
        const adminDoc = await getDoc(doc(db,"admins",u.uid));
        const ok = adminDoc.exists() && adminDoc.data().active === true;
        setIsAdmin(ok);
        if (ok) await loadQueue();
      } catch (e) { console.error(e); setError("Tidak bisa memverifikasi admin. Pastikan admins/{UID} tersedia dan Firestore Rules mengizinkan pemeriksaan."); }
    }
  }), []);

  async function loadQueue() {
    setLoading(true); setError("");
    try {
      const [appSnap, songSnap] = await Promise.all([
        getDocs(query(collection(db,"bandApplications"), where("status","in",["pending","needs_changes"]), limit(100))),
        getDocs(query(collection(db,"songs"), where("status","==","pending"), limit(100)))
      ]);
      setApplications(appSnap.docs.map(d => ({id:d.id,...d.data()} as Application)));
      setSongs(songSnap.docs.map(d => ({id:d.id,...d.data()} as SongReview)));
    } catch (e) { console.error(e); setError("Gagal mengambil antrean. Periksa Firestore Rules dan indeks Firestore jika diminta."); }
    finally { setLoading(false); }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { await signInWithEmailAndPassword(auth,email.trim(),password); }
    catch (e) { setError(e instanceof Error ? e.message : "Login gagal."); }
    finally { setLoading(false); }
  }

  async function reviewApplication(app: Application, decision: "approve" | "reject" | "changes") {
    setBusyId(app.id); setError("");
    const note = (notes[app.id] || "").trim();
    if ((decision === "reject" || decision === "changes") && !note) { setError("Isi catatan admin sebelum menolak atau meminta revisi."); setBusyId(""); return; }
    try {
      const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "needs_changes";
      const batch = writeBatch(db);
      const applicationRef = doc(db, "bandApplications", app.id);
      if (decision === "approve") {
        const bandId = app.id;
        batch.set(doc(db, "bands", bandId), {
          name: app.bandName, slug: app.slug, genre: app.genre || "", origin: app.origin || "", description: app.description || "",
          instagramUrl: app.instagramUrl || "", ownerUid: app.ownerUid, verificationStatus: "approved", isPublished: true,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        batch.set(doc(db, "users", app.ownerUid), { role: "band", bandId, email: app.ownerEmail || app.contactEmail || "", updatedAt: serverTimestamp() }, { merge: true });
        batch.update(applicationRef, { status, bandId, reviewNote: note, reviewedBy: user?.uid || "", reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      } else {
        batch.update(applicationRef, { status, reviewNote: note, reviewedBy: user?.uid || "", reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await batch.commit();
      await loadQueue();
    } catch (e) { console.error(e); setError("Review gagal. Pastikan akun ini tercatat di admins/{UID} dan rules sudah diterapkan."); }
    finally { setBusyId(""); }
  }

  async function reviewSong(song: SongReview, decision: "approve" | "reject") {
    setBusyId(song.id); setError("");
    const note = (notes[song.id] || "").trim();
    if (decision === "reject" && !note) { setError("Isi alasan penolakan lagu terlebih dahulu."); setBusyId(""); return; }
    try {
      await updateDoc(doc(db,"songs",song.id), {
        status: decision === "approve" ? "published" : "rejected",
        isPublished: decision === "approve",
        reviewNote: note,
        reviewedBy: user?.uid || "",
        reviewedAt: serverTimestamp(),
        updatedAt: Date.now()
      });
      await loadQueue();
    } catch (e) { console.error(e); setError("Review lagu gagal. Periksa Firestore Rules."); }
    finally { setBusyId(""); }
  }

  if (!authReady) return <main className="min-h-screen bg-black p-8 text-white/60">Memeriksa sesi admin...</main>;
  return <main className="min-h-screen bg-black text-white"><div className="pointer-events-none fixed inset-0"><div className="absolute left-1/2 top-0 h-96 w-[700px] -translate-x-1/2 rounded-full bg-amber-300/[0.04] blur-[150px]"/></div><header className="relative z-10 border-b border-white/10 bg-black/70 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"><Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/45 hover:text-amber-300"><ArrowLeft size={15}/> MELODIX</Link>{user && <button onClick={() => signOut(auth)} className="inline-flex items-center gap-2 text-xs text-white/45 hover:text-white"><LogOut size={14}/> Keluar</button>}</div></header><div className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14"><p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-amber-300">ADMIN CONTROL</p><h1 className="text-4xl font-black tracking-[-0.06em] sm:text-6xl">Review <span className="text-amber-300">Queue.</span></h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">Verifikasi identitas band dan moderasi publikasi lagu. Akses ditentukan oleh dokumen <code>admins/{"{UID}"}</code>, bukan dari pilihan role di UI.</p>
    {error && <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-300/[0.06] p-4 text-sm text-red-100"><CircleAlert size={17}/>{error}</div>}
    {!user ? <form onSubmit={login} className="mt-8 max-w-md rounded-3xl border border-white/10 bg-white/[0.025] p-6"><ShieldCheck className="mb-5 text-amber-300" size={28}/><h2 className="mb-6 text-xl font-black">Admin sign in</h2><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">Email</label><input className={`${input} mb-4`} type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">Password</label><input className={`${input} mb-5`} type="password" required value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={loading} className="w-full rounded-xl bg-amber-300 py-3 text-sm font-black text-black disabled:opacity-50">{loading ? "Memproses..." : "Masuk"}</button></form> : !isAdmin ? <div className="mt-8 max-w-2xl rounded-3xl border border-red-300/20 bg-red-300/[0.04] p-6"><h2 className="font-black text-red-200">Akun bukan admin</h2><p className="mt-2 text-sm leading-6 text-white/50">Sesi sudah masuk, tetapi UID akun ini tidak ditemukan di koleksi <code>admins</code>. Minta pemilik proyek menambahkan dokumen <code>admins/{user.uid}</code> melalui Firebase Console.</p></div> : <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><div className="flex gap-2"><button onClick={()=>setFilter("applications")} className={`rounded-full px-4 py-2.5 text-xs font-black ${filter === "applications" ? "bg-amber-300 text-black" : "border border-white/10 text-white/50"}`}>Pengajuan band ({applications.length})</button><button onClick={()=>setFilter("songs")} className={`rounded-full px-4 py-2.5 text-xs font-black ${filter === "songs" ? "bg-amber-300 text-black" : "border border-white/10 text-white/50"}`}>Review lagu ({songs.length})</button></div><button onClick={()=>loadQueue()} className="rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-white/50 hover:text-white">Refresh antrean</button></div>
      {loading && <p className="mt-6 flex items-center gap-2 text-sm text-white/40"><LoaderCircle className="animate-spin" size={16}/> Memuat antrean...</p>}
      {filter === "applications" ? <div className="mt-5 grid gap-4">{applications.length ? applications.map(app => <article key={app.id} className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black">{app.bandName}</h2><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-200">{app.status}</span></div><p className="mt-2 text-xs text-white/40">{app.genre || "Genre belum diisi"} {app.origin ? `· ${app.origin}` : ""}</p><p className="mt-1 text-xs text-white/30">{app.contactEmail || app.ownerEmail || app.ownerUid}</p></div><a href={app.instagramUrl || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-amber-200">Instagram <ExternalLink size={12}/></a></div><p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-white/65">{app.description || "Tidak ada deskripsi."}</p><label className="mb-2 mt-5 block text-[10px] font-bold uppercase tracking-widest text-white/35">Catatan review (wajib jika menolak/minta revisi)</label><textarea className={`${input} min-h-20 resize-y`} value={notes[app.id] || ""} onChange={e=>setNotes({...notes,[app.id]:e.target.value})} placeholder="Catatan untuk band..."/><div className="mt-4 flex flex-wrap gap-2"><button disabled={!!busyId} onClick={()=>reviewApplication(app,"approve")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-black disabled:opacity-40"><Check size={14}/> Verifikasi band</button><button disabled={!!busyId} onClick={()=>reviewApplication(app,"changes")} className="rounded-xl border border-sky-300/20 px-4 py-3 text-xs font-black text-sky-200 disabled:opacity-40">Minta revisi</button><button disabled={!!busyId} onClick={()=>reviewApplication(app,"reject")} className="inline-flex items-center gap-2 rounded-xl border border-red-300/20 px-4 py-3 text-xs font-black text-red-200 disabled:opacity-40"><X size={14}/> Tolak</button></div></article>) : !loading && <Empty text="Tidak ada pengajuan band yang perlu ditinjau."/>}</div> : <div className="mt-5 grid gap-4">{songs.length ? songs.map(song => <article key={song.id} className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 sm:p-7"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200"><Music2 size={20}/></div><div className="min-w-0 flex-1"><h2 className="text-xl font-black">{song.title}</h2><p className="mt-1 text-xs text-white/40">{song.artist || "Unknown artist"} · {song.originalKey || "Key —"} · {song.bpm || "—"} BPM</p></div></div><pre className="mt-5 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-white/5 bg-black/50 p-4 font-mono text-xs leading-6 text-white/60">{song.lyricsWithChords || "Tidak ada lirik."}</pre><label className="mb-2 mt-5 block text-[10px] font-bold uppercase tracking-widest text-white/35">Catatan (wajib untuk penolakan)</label><textarea className={`${input} min-h-16 resize-y`} value={notes[song.id] || ""} onChange={e=>setNotes({...notes,[song.id]:e.target.value})} placeholder="Catatan review..."/><div className="mt-4 flex flex-wrap gap-2"><button disabled={!!busyId} onClick={()=>reviewSong(song,"approve")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-black disabled:opacity-40"><Check size={14}/> Setujui & tayangkan</button><button disabled={!!busyId} onClick={()=>reviewSong(song,"reject")} className="inline-flex items-center gap-2 rounded-xl border border-red-300/20 px-4 py-3 text-xs font-black text-red-200 disabled:opacity-40"><X size={14}/> Tolak lagu</button></div></article>) : !loading && <Empty text="Tidak ada lagu yang menunggu review."/>}</div>}
    </>}
    </div></main>;
}
function Empty({text}:{text:string}) { return <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center text-sm text-white/35">{text}</div>; }
