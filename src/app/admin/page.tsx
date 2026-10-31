"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query,
  serverTimestamp, updateDoc, writeBatch,
} from "firebase/firestore";
import {
  Activity, BadgeCheck, Bell, Check, ChevronRight, CircleAlert, Disc3,
  Eye, EyeOff, FileMusic, LayoutDashboard, LoaderCircle, LogOut, Music2,
  Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users, X,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";

type Row = Record<string, any> & { id: string };
type Section = "overview" | "applications" | "bands" | "songs" | "albums" | "users" | "announcements";
type Action = "publish" | "draft" | "approve" | "reject" | "suspend" | "activate" | "delete";

const COLLECTIONS = ["bandApplications", "bands", "songs", "albums", "users", "announcements"];
const MAP: Record<Exclude<Section, "overview">, string> = {
  applications: "bandApplications", bands: "bands", songs: "songs",
  albums: "albums", users: "users", announcements: "announcements",
};
const NAV: { id: Section; label: string; icon: any }[] = [
  { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { id: "applications", label: "Pengajuan band", icon: BadgeCheck },
  { id: "bands", label: "Manajemen band", icon: Users },
  { id: "songs", label: "Semua lagu", icon: Music2 },
  { id: "albums", label: "Album", icon: Disc3 },
  { id: "users", label: "Pengguna", icon: ShieldCheck },
  { id: "announcements", label: "Pengumuman", icon: Bell },
];
const INPUT = "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-amber-300/60";
const titleOf = (r: Row) => String(r.title || r.bandName || r.name || r.displayName || r.email || r.id);
const TITLES: Record<Section, string> = {
  overview: "Ringkasan platform", applications: "Pengajuan band", bands: "Manajemen band",
  songs: "Manajemen lagu", albums: "Manajemen album", users: "Manajemen pengguna",
  announcements: "Pengumuman platform",
};
const EMPTY_BAND = {
  name: "", slug: "", genre: "", origin: "", description: "", formedYear: "",
  instagramUrl: "", spotifyUrl: "", youtubeUrl: "", websiteUrl: "",
  logoUrl: "", coverImageUrl: "", ownerUid: "", membersText: "",
  isPublished: false, verificationStatus: "approved",
};

export default function AdminControlCenter() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBand, setEditingBand] = useState<Row | null>(null);
  const [band, setBand] = useState({ ...EMPTY_BAND });

  const verify = useCallback(async (u: User | null) => {
    setUser(u); setAdmin(false); setData({}); setError("");
    if (!u) return;
    try {
      const snap = await getDoc(doc(db, "admins", u.uid));
      const allowed = snap.exists() && snap.data().active === true;
      setAdmin(allowed);
      if (!allowed) setError("Akun ini belum memiliki akses admin aktif.");
    } catch (e) {
      console.error(e); setError("Gagal memverifikasi admin. Periksa admins/{UID} dan Firestore Rules.");
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, u => { setReady(true); void verify(u); }), [verify]);

  const load = useCallback(async () => {
    if (!user || !admin) return;
    setLoading(true); setError("");
    const result: Record<string, Row[]> = {};
    const failed: string[] = [];
    await Promise.all(COLLECTIONS.map(async name => {
      try {
        const snap = await getDocs(query(collection(db, name), limit(300)));
        result[name] = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Row[];
      } catch (e) {
        console.error(`[Admin] ${name}`, e); result[name] = []; failed.push(name);
      }
    }));
    setData(result);
    if (failed.length) setError(`Gagal memuat koleksi: ${failed.join(", ")}. Periksa Rules.`);
    setLoading(false);
  }, [user, admin]);

  useEffect(() => { if (admin && user) void load(); }, [admin, user, load]);

  const rows = useMemo(() => {
    const source = section === "overview" ? data.songs || [] : data[MAP[section]] || [];
    const term = search.trim().toLowerCase();
    return term ? source.filter(r => [titleOf(r), r.email, r.artist, r.status, r.slug, r.ownerUid].filter(Boolean).join(" ").toLowerCase().includes(term)) : source;
  }, [data, section, search]);

  const counts = useMemo(() => ({
    songs: (data.songs || []).length, bands: (data.bands || []).length,
    applications: (data.bandApplications || []).filter(r => ["pending", "needs_changes"].includes(r.status)).length,
    users: (data.users || []).length, albums: (data.albums || []).length,
  }), [data]);

  async function login(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { await signInWithEmailAndPassword(auth, email.trim(), password); }
    catch (e) { setError(e instanceof Error ? e.message : "Login gagal."); }
    finally { setLoading(false); }
  }
  async function logout() { await signOut(auth); setData({}); setAdmin(false); }

  async function audit(action: string, col: string, row: Row) {
    await addDoc(collection(db, "adminAuditLogs"), {
      actorUid: user!.uid, action, collection: col, documentId: row.id,
      itemTitle: titleOf(row), createdAt: serverTimestamp(),
    });
  }

  async function mutate(col: string, row: Row, action: Action) {
    if (!user || !admin) return;
    if (action === "delete" && !window.confirm(`Hapus permanen "${titleOf(row)}"?`)) return;
    let note = "";
    if (action === "reject") {
      note = window.prompt("Alasan penolakan:")?.trim() || "";
      if (!note) { setError("Alasan penolakan wajib diisi."); return; }
    }
    setBusy(`${col}/${row.id}`); setError(""); setSuccess("");
    try {
      const batch = writeBatch(db);
      const target = doc(db, col, row.id);
      if (action === "delete") batch.delete(target);
      else if (col === "bandApplications" && action === "approve") {
        if (!row.ownerUid) throw new Error("Pengajuan tidak memiliki ownerUid.");
        const bandId = String(row.bandId || row.id);
        batch.set(doc(db, "bands", bandId), {
          name: row.bandName || row.name || "Band", slug: row.slug || bandId,
          genre: row.genre || "", origin: row.origin || "", description: row.description || "",
          instagramUrl: row.instagramUrl || "", ownerUid: row.ownerUid,
          verificationStatus: "approved", status: "published", isPublished: true,
          publishedAt: serverTimestamp(), approvedAt: serverTimestamp(),
          createdAt: row.createdAt || serverTimestamp(), updatedAt: serverTimestamp(),
        }, { merge: true });
        batch.set(doc(db, "users", row.ownerUid), {
          uid: row.ownerUid, role: "band", bandId, updatedAt: serverTimestamp(),
        }, { merge: true });
        batch.update(target, {
          status: "approved", bandId, reviewNote: "", reviewedBy: user.uid,
          reviewedAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      } else {
        const patch: Record<string, any> = { updatedAt: serverTimestamp(), adminUpdatedBy: user.uid };
        if (action === "publish") {
          patch.isPublished = true; patch.status = "published"; patch.publishedAt = serverTimestamp();
          if (col === "bands") patch.verificationStatus = "approved";
        }
        if (action === "draft") { patch.isPublished = false; patch.status = "draft"; }
        if (action === "reject") {
          patch.isPublished = false; patch.status = "rejected"; patch.reviewNote = note;
          patch.reviewedBy = user.uid; patch.reviewedAt = serverTimestamp();
        }
        if (action === "suspend") { patch.isSuspended = true; patch.status = "suspended"; }
        if (action === "activate") { patch.isSuspended = false; patch.status = "active"; }
        batch.update(target, patch);
      }
      const log = doc(collection(db, "adminAuditLogs"));
      batch.set(log, { actorUid: user.uid, action, collection: col, documentId: row.id, itemTitle: titleOf(row), createdAt: serverTimestamp() });
      await batch.commit();
      setSuccess(`${action} berhasil: ${titleOf(row)}`); await load();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      console.error(e); setError(`Aksi gagal ${err.code || ""}: ${err.message || "Periksa Firestore Rules."}`);
    } finally { setBusy(""); }
  }

  function openBand(row?: Row) {
    setEditingBand(row || null);
    const members = Array.isArray(row?.members) ? row!.members : [];
    setBand({
      ...EMPTY_BAND, ...(row || {}),
      formedYear: row?.formedYear ? String(row.formedYear) : "",
      membersText: members.map((m: any) => `${m.name || ""} | ${m.role || ""} | ${m.photoUrl || ""}`).join("\n"),
    });
    setEditorOpen(true);
  }

  async function saveBand(e: FormEvent) {
    e.preventDefault(); if (!user) return;
    setBusy("save-band"); setError(""); setSuccess("");
    try {
      const members = band.membersText.split("\n").map(x => x.trim()).filter(Boolean).map(line => {
        const [name = "", role = "", photoUrl = ""] = line.split("|").map(x => x.trim());
        return { name, role, photoUrl };
      });
      const payload: Record<string, any> = {
        name: band.name.trim(), slug: band.slug.trim(), genre: band.genre.trim(),
        origin: band.origin.trim(), description: band.description.trim(),
        formedYear: band.formedYear ? Number(band.formedYear) : null,
        instagramUrl: band.instagramUrl.trim(), spotifyUrl: band.spotifyUrl.trim(),
        youtubeUrl: band.youtubeUrl.trim(), websiteUrl: band.websiteUrl.trim(),
        logoUrl: band.logoUrl.trim(), coverImageUrl: band.coverImageUrl.trim(),
        ownerUid: band.ownerUid.trim(), members,
        verificationStatus: band.verificationStatus,
        isPublished: band.isPublished, status: band.isPublished ? "published" : "draft",
        updatedAt: serverTimestamp(), adminUpdatedBy: user.uid,
      };
      if (!payload.name || !payload.slug) throw new Error("Nama band dan slug wajib diisi.");
      let id = editingBand?.id;
      if (editingBand) await updateDoc(doc(db, "bands", editingBand.id), payload);
      else {
        const created = await addDoc(collection(db, "bands"), { ...payload, createdAt: serverTimestamp() });
        id = created.id;
      }
      await addDoc(collection(db, "adminAuditLogs"), {
        actorUid: user.uid, action: editingBand ? "edit" : "create",
        collection: "bands", documentId: id, itemTitle: payload.name, createdAt: serverTimestamp(),
      });
      setEditorOpen(false); setSuccess("Profil band berhasil disimpan."); await load();
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(`Gagal menyimpan band ${err.code || ""}: ${err.message || ""}`);
    } finally { setBusy(""); }
  }

  async function createAnnouncement(e: FormEvent) {
    e.preventDefault(); if (!user || !noticeTitle.trim() || !noticeBody.trim()) return;
    setBusy("announcement");
    try {
      await addDoc(collection(db, "announcements"), {
        title: noticeTitle.trim(), body: noticeBody.trim(), isPublished: true,
        status: "published", createdBy: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setNoticeTitle(""); setNoticeBody(""); setSuccess("Pengumuman dipublikasikan."); await load();
    } catch (e) { const err = e as any; setError(`Gagal membuat pengumuman: ${err.code || ""} ${err.message || ""}`); }
    finally { setBusy(""); }
  }

  if (!ready) return <main className="min-h-screen bg-black p-8 text-white/50"><LoaderCircle className="inline animate-spin" /> Memeriksa sesi admin...</main>;
  if (!user) return <main className="min-h-screen bg-[#080808] px-5 py-16 text-white"><div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8">
    <p className="text-[10px] font-black uppercase tracking-[.35em] text-amber-300">MELODIX · ROOT ADMIN</p><h1 className="mt-3 text-4xl font-black">Control <span className="text-amber-300">Center.</span></h1>
    {error && <Alert type="error">{error}</Alert>}<form onSubmit={login} className="mt-7 space-y-4">
      <label className="block text-xs text-white/50">Email<input className={`${INPUT} mt-2`} type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label className="block text-xs text-white/50">Password<input className={`${INPUT} mt-2`} type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      <button disabled={loading} className="w-full rounded-xl bg-amber-300 py-3 font-black text-black">{loading ? "Memproses..." : "Masuk ke Admin"}</button>
    </form><Link href="/" className="mt-5 block text-center text-xs text-white/40">← Kembali ke Melodix</Link>
  </div></main>;
  if (!admin) return <main className="min-h-screen bg-black p-6 text-white"><div className="mx-auto mt-20 max-w-xl rounded-3xl border border-red-300/20 p-7"><CircleAlert className="text-red-300"/><h1 className="mt-4 text-2xl font-black">Akses ditolak</h1><p className="mt-2 text-sm text-white/50">Akun belum memiliki akses admin aktif.</p><p className="mt-3 break-all font-mono text-xs text-white/35">UID: {user.uid}</p><button onClick={logout} className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-sm">Keluar</button></div></main>;

  return <main className="min-h-screen bg-[#080808] text-white">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/10 bg-[#0b0b0b] p-5 lg:flex">
      <Link href="/" className="flex items-center gap-3 border-b border-white/10 pb-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-lg font-black text-black">M</span><span><b className="block text-sm tracking-[.2em]">MELODIX</b><small className="text-[10px] uppercase tracking-widest text-amber-300">Root Admin</small></span></Link>
      <nav className="mt-6 space-y-1">{NAV.map(n => { const Icon = n.icon; return <button key={n.id} onClick={() => { setSection(n.id); setSearch(""); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${section === n.id ? "bg-amber-300 text-black" : "text-white/50 hover:bg-white/5"}`}><Icon size={17}/>{n.label}{n.id === "applications" && counts.applications > 0 && <span className="ml-auto rounded-full bg-red-500 px-2 text-[10px]">{counts.applications}</span>}</button>; })}</nav>
      <div className="mt-auto rounded-2xl border border-amber-300/15 p-4"><p className="text-[10px] font-black uppercase text-amber-200">Admin aktif</p><p className="mt-2 truncate text-xs text-white/60">{user.email}</p><button onClick={logout} className="mt-4 flex items-center gap-2 text-xs text-white/40"><LogOut size={14}/>Keluar</button></div>
    </aside>
    <section className="lg:pl-64">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080808]/90 px-5 py-4 backdrop-blur-xl sm:px-8"><div><p className="text-[9px] font-black uppercase tracking-[.3em] text-amber-300">MELODIX / ADMIN</p><h1 className="mt-1 text-lg font-black">{TITLES[section]}</h1></div><div className="flex gap-2"><Link href="/admin/music-studio" className="hidden items-center gap-2 rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-black sm:flex"><Plus size={14}/>Music Studio</Link><button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 p-2.5"><RefreshCw size={16} className={loading ? "animate-spin" : ""}/></button></div></header>
      <div className="border-b border-white/10 px-4 py-3 lg:hidden"><div className="flex gap-2 overflow-x-auto">{NAV.map(n => <button key={n.id} onClick={() => setSection(n.id)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${section === n.id ? "bg-amber-300 text-black" : "bg-white/5 text-white/50"}`}>{n.label}</button>)}</div></div>
      <div className="mx-auto max-w-7xl p-4 sm:p-8">
        {error && <Alert type="error" onClose={() => setError("")}>{error}</Alert>}{success && <Alert type="success" onClose={() => setSuccess("")}>{success}</Alert>}
        {section === "overview" && <Overview counts={counts} data={data} onNavigate={setSection}/>}
        {section === "bands" && <div className="mb-4 flex justify-end"><button onClick={() => openBand()} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-black"><Plus size={15}/>Tambah band</button></div>}
        {section === "announcements" && <form onSubmit={createAnnouncement} className="mb-6 max-w-3xl rounded-2xl border border-white/10 p-5"><h2 className="font-black">Buat pengumuman</h2><input className={`${INPUT} mt-4`} value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} placeholder="Judul" required/><textarea className={`${INPUT} mt-3 min-h-28`} value={noticeBody} onChange={e => setNoticeBody(e.target.value)} placeholder="Isi pengumuman..." required/><button className="mt-3 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-black">Publikasikan</button></form>}
        {section !== "overview" && <><div className="mb-4 flex gap-3"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-white/30"/><input className={`${INPUT} pl-9`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, email, artis, status..."/></label><span className="self-center text-xs text-white/35">{rows.length} data</span></div>
          {loading ? <p className="py-16 text-sm text-white/40"><LoaderCircle className="mr-2 inline animate-spin"/>Memuat...</p> : <Records rows={rows} collectionName={MAP[section]} busy={busy} onAction={mutate} onEditBand={openBand}/>}
        </>}
      </div>
    </section>
    {editorOpen && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"><form onSubmit={saveBand} className="mx-auto my-6 max-w-3xl rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-amber-300">Band manager</p><h2 className="mt-1 text-2xl font-black">{editingBand ? "Edit band" : "Tambah band"}</h2></div><button type="button" onClick={() => setEditorOpen(false)}><X/></button></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["name","slug","genre","origin","formedYear","ownerUid","logoUrl","coverImageUrl","instagramUrl","spotifyUrl","youtubeUrl","websiteUrl"] as const).map(k => <label key={k} className="block text-xs capitalize text-white/50">{k}<input className={`${INPUT} mt-2`} value={band[k]} onChange={e => setBand(s => ({...s,[k]:e.target.value}))}/></label>)}
      </div>
      <label className="mt-3 block text-xs text-white/50">Deskripsi<textarea className={`${INPUT} mt-2 min-h-24`} value={band.description} onChange={e => setBand(s => ({...s,description:e.target.value}))}/></label>
      <label className="mt-3 block text-xs text-white/50">Anggota (satu per baris: Nama | Peran | URL foto)<textarea className={`${INPUT} mt-2 min-h-28 font-mono`} value={band.membersText} onChange={e => setBand(s => ({...s,membersText:e.target.value}))}/></label>
      <div className="mt-4 flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={band.isPublished} onChange={e => setBand(s => ({...s,isPublished:e.target.checked}))}/>Publikasikan</label><label className="flex items-center gap-2"><input type="checkbox" checked={band.verificationStatus === "approved"} onChange={e => setBand(s => ({...s,verificationStatus:e.target.checked ? "approved" : "pending"}))}/>Terverifikasi</label></div>
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Batal</button><button disabled={busy === "save-band"} className="rounded-xl bg-amber-300 px-5 py-2 text-sm font-black text-black">{busy === "save-band" ? "Menyimpan..." : "Simpan band"}</button></div>
    </form></div>}
  </main>;
}

function Overview({ counts, data, onNavigate }: { counts: any; data: Record<string, Row[]>; onNavigate: (s: Section) => void }) {
  const pending = (data.bandApplications || []).filter(x => x.status === "pending").length;
  const hidden = (data.bands || []).filter(x => x.isPublished !== true).length;
  const cards = [["Lagu",counts.songs,Music2],["Band",counts.bands,Users],["Pengajuan",counts.applications,BadgeCheck],["Pengguna",counts.users,ShieldCheck],["Album",counts.albums,Disc3]];
  return <><div className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-5">{cards.map(([label,value,Icon]: any) => <article key={label} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex justify-between text-xs text-white/40">Total {label}<Icon size={17} className="text-amber-300"/></div><p className="mt-4 text-3xl font-black">{value}</p></article>)}</div><div className="grid gap-4 xl:grid-cols-2"><article className="rounded-2xl border border-white/10 p-5"><h2 className="font-black">Perlu ditindaklanjuti</h2>{[["Pengajuan band",pending,"applications"],["Band belum tayang",hidden,"bands"]].map(([label,value,id]: any)=><button key={id} onClick={()=>onNavigate(id)} className="mt-3 flex w-full justify-between rounded-xl bg-white/[.03] p-3 text-sm">{label}<b>{value}<ChevronRight className="ml-2 inline text-amber-300" size={15}/></b></button>)}</article><article className="rounded-2xl border border-white/10 p-5"><h2 className="font-black">Akses cepat</h2><div className="mt-4 grid gap-2 sm:grid-cols-2"><Link href="/admin/music-studio" className="rounded-xl border border-white/10 p-3 text-sm"><FileMusic className="mr-2 inline" size={16}/>Music Studio</Link><Link href="/" className="rounded-xl border border-white/10 p-3 text-sm"><Activity className="mr-2 inline" size={16}/>Lihat website</Link></div></article></div></>;
}

function Records({ rows, collectionName, busy, onAction, onEditBand }: { rows: Row[]; collectionName: string; busy: string; onAction: (c:string,r:Row,a:Action)=>Promise<void>; onEditBand: (r:Row)=>void }) {
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-white/35">Tidak ada data pada koleksi ini.</div>;
  return <div className="grid gap-3">{rows.map(row => {
    const pending = busy === `${collectionName}/${row.id}`;
    const app = collectionName === "bandApplications"; const user = collectionName === "users";
    const canPublish = ["bands","songs","albums","announcements"].includes(collectionName);
    const status = row.status || (row.isPublished ? "published" : "draft");
    return <article key={row.id} className="rounded-2xl border border-white/10 bg-white/[.02] p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words font-black">{titleOf(row)}</h2><span className="rounded-full bg-white/5 px-2 py-1 text-[9px] uppercase text-amber-200">{status}</span></div><p className="mt-1 break-all text-xs text-white/35">{row.email || row.artist || row.slug || row.ownerEmail || row.id}</p>{row.ownerUid && <p className="mt-1 break-all font-mono text-[10px] text-white/25">Owner: {row.ownerUid}</p>}{row.description && <p className="mt-3 line-clamp-3 text-sm text-white/50">{row.description}</p>}</div><div className="flex flex-wrap gap-2">
      {app && <><Action good disabled={pending} onClick={()=>void onAction(collectionName,row,"approve")}><Check size={13}/>Setujui</Action><Action danger disabled={pending} onClick={()=>void onAction(collectionName,row,"reject")}><X size={13}/>Tolak</Action></>}
      {collectionName === "bands" && <Action disabled={pending} onClick={()=>onEditBand(row)}><Pencil size={13}/>Edit</Action>}
      {canPublish && (row.isPublished ? <Action disabled={pending} onClick={()=>void onAction(collectionName,row,"draft")}><EyeOff size={13}/>Unpublish</Action> : <Action good disabled={pending} onClick={()=>void onAction(collectionName,row,"publish")}><Eye size={13}/>Publish</Action>)}
      {user && (row.isSuspended ? <Action good disabled={pending} onClick={()=>void onAction(collectionName,row,"activate")}>Aktifkan</Action> : <Action danger disabled={pending} onClick={()=>void onAction(collectionName,row,"suspend")}>Suspend</Action>)}
      {!app && !user && <Action danger disabled={pending} onClick={()=>void onAction(collectionName,row,"delete")}><Trash2 size={13}/>Hapus</Action>}
      {pending && <LoaderCircle size={16} className="animate-spin text-amber-300"/>}
    </div></div></article>;
  })}</div>;
}
function Action({children,onClick,disabled,good,danger}:{children:React.ReactNode;onClick:()=>void;disabled?:boolean;good?:boolean;danger?:boolean}) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-black disabled:opacity-40 ${good?"border-emerald-300/20 bg-emerald-300/10 text-emerald-200":danger?"border-red-300/20 bg-red-300/[.05] text-red-200":"border-white/10 text-white/55 hover:border-amber-300/30"}`}>{children}</button>;
}
function Alert({children,type,onClose}:{children:React.ReactNode;type:"error"|"success";onClose?:()=>void}) {
  return <div className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${type==="error"?"border-red-300/20 bg-red-300/[.06] text-red-100":"border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100"}`}><span className="min-w-0 flex-1 break-words">{children}</span>{onClose&&<button onClick={onClose}><X size={15}/></button>}</div>;
}
