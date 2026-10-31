"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import GitHubImageUpload from "@/components/GitHubImageUpload";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  Disc3,
  ExternalLink,
  LoaderCircle,
  LogOut,
  Music2,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

type AppStatus = "pending" | "approved" | "rejected" | "needs_changes";

type Application = {
  id: string;
  ownerUid: string;
  bandName: string;
  slug: string;
  genre: string;
  origin: string;
  description: string;
  contactEmail: string;
  instagramUrl: string;
  status: AppStatus;
  reviewNote?: string;
  bandId?: string;
};

type StudioSong = {
  id: string;
  title: string;
  slug: string;
  artist: string;
  lyricsWithChords: string;
  originalKey: string;
  bpm: string;
  capo: string;
  status: string;
  isPublished: boolean;
  coverImageUrl?: string;
  updatedAt?: unknown;
};

type StudioAlbum = {
  id: string;
  ownerUid: string;
  bandId: string;
  name: string;
  slug: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  isPublished?: boolean;
};

type BandProfile = {
  id: string;
  name: string;
  slug: string;
  genre?: string;
  origin?: string;
  description?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  ownerUid: string;
  verificationStatus?: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-amber-300/60 focus:bg-white/[0.06]";

const labelClass =
  "mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-white/45";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function BandStudioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [application, setApplication] = useState<Application | null>(null);
  const [editingApplication, setEditingApplication] = useState(false);

  const [band, setBand] = useState<BandProfile | null>(null);
  const [songs, setSongs] = useState<StudioSong[]>([]);
  const [albums, setAlbums] = useState<StudioAlbum[]>([]);

  const [showAlbumForm, setShowAlbumForm] = useState(false);

  const [albumForm, setAlbumForm] = useState({
    name: "",
    description: "",
    coverUrl: "",
    releaseDate: "",
  });

  const [tab, setTab] = useState<
    "overview" | "profile" | "songs" | "albums"
  >("overview");

  const [showSongForm, setShowSongForm] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    genre: "",
    origin: "",
    description: "",
    instagramUrl: "",
    websiteUrl: "",
    spotifyUrl: "",
    youtubeUrl: "",
    logoUrl: "",
    coverImageUrl: "",
  });

  const [songForm, setSongForm] = useState({
    title: "",
    lyricsWithChords: "",
    originalKey: "",
    bpm: "",
    capo: "0",
    description: "",
    coverImageUrl: "",
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  // =========================================================
  // LOAD WORKSPACE
  // =========================================================

  async function loadWorkspace(u: User) {
    setBusy(true);
    setMessage("");

    let currentStep = "inisialisasi workspace";

    try {
      currentStep = "membaca dokumen users/{uid}";

      const userSnap = await getDoc(doc(db, "users", u.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};

      currentStep = "membaca pengajuan band (bandApplications)";

      const appQuery = query(
        collection(db, "bandApplications"),
        where("ownerUid", "==", u.uid),
        limit(1)
      );

      const appSnap = await getDocs(appQuery);

      const foundApp = appSnap.empty
        ? null
        : ({
            id: appSnap.docs[0].id,
            ...appSnap.docs[0].data(),
          } as Application);

      setApplication(foundApp);

      const bandId =
        (userData.bandId as string | undefined) || foundApp?.bandId;

      if (userData.role === "band" && bandId) {
        currentStep = `membaca profil bands/${bandId}`;

        const bandSnap = await getDoc(doc(db, "bands", bandId));

        if (bandSnap.exists()) {
          const b = {
            id: bandSnap.id,
            ...bandSnap.data(),
          } as BandProfile;

          setBand(b);

          setProfileForm({
            name: b.name || "",
            genre: b.genre || "",
            origin: b.origin || "",
            description: b.description || "",
            instagramUrl: b.instagramUrl || "",
            websiteUrl: b.websiteUrl || "",
            spotifyUrl: b.spotifyUrl || "",
            youtubeUrl: b.youtubeUrl || "",
            logoUrl: b.logoUrl || "",
            coverImageUrl: b.coverImageUrl || "",
          });

          // LOAD SONGS
          currentStep = "membaca katalog lagu (songs)";

          const songQuery = query(
            collection(db, "songs"),
            where("ownerUid", "==", u.uid),
            where("bandId", "==", bandId),
            limit(100)
          );

          const songSnap = await getDocs(songQuery);

          setSongs(
            songSnap.docs
              .map((d) => ({
                id: d.id,
                ...d.data(),
              }) as StudioSong)
              .sort((a, b) => {
                const aTime =
                  typeof a.updatedAt === "number" ? a.updatedAt : 0;

                const bTime =
                  typeof b.updatedAt === "number" ? b.updatedAt : 0;

                return bTime - aTime;
              })
          );

          // LOAD ALBUMS
          currentStep = "membaca katalog album (albums)";

          const albumQuery = query(
            collection(db, "albums"),
            where("ownerUid", "==", u.uid),
            where("bandId", "==", bandId),
            limit(100)
          );

          const albumSnap = await getDocs(albumQuery);

          setAlbums(
            albumSnap.docs.map(
              (d) =>
                ({
                  id: d.id,
                  ...d.data(),
                }) as StudioAlbum
            )
          );
        } else {
          setBand(null);
          setSongs([]);
          setAlbums([]);
        }
      } else {
        setBand(null);
        setSongs([]);
        setAlbums([]);
      }
    } catch (e) {
      const err = e as {
        code?: string;
        message?: string;
      };

      const code = err?.code || "unknown";
      const detail =
        err?.message || "Tidak ada detail error dari Firebase.";

      console.error(
        `[Band Studio] Gagal saat ${currentStep}`,
        e
      );

      setMessage(
        `Gagal saat ${currentStep}. Kode: ${code}. ${detail}`
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (user) {
      void loadWorkspace(user);
    } else {
      setApplication(null);
      setBand(null);
      setSongs([]);
      setAlbums([]);
    }
  }, [user]);

  // =========================================================
  // AUTHENTICATION
  // =========================================================

  async function handleAuth(e: FormEvent) {
    e.preventDefault();

    setBusy(true);
    setMessage("");

    try {
      if (authMode === "register") {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName || "",
          role: "fan",
          createdAt: serverTimestamp(),
        });

        setMessage(
          "Akun dibuat. Lengkapi pengajuan band di bawah."
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // =========================================================
  // SUBMIT BAND APPLICATION
  // =========================================================

  async function submitApplication(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!user) return;

    setBusy(true);
    setMessage("");

    const form = new FormData(e.currentTarget);

    const bandName = String(
      form.get("bandName") || ""
    ).trim();

    const slug = slugify(
      String(form.get("slug") || bandName)
    );

    try {
      const applicationData = {
        ownerUid: user.uid,
        ownerEmail: user.email || "",
        bandName,
        slug,

        genre: String(form.get("genre") || "").trim(),
        origin: String(form.get("origin") || "").trim(),

        description: String(
          form.get("description") || ""
        ).trim(),

        contactEmail: String(
          form.get("contactEmail") || user.email || ""
        ).trim(),

        instagramUrl: String(
          form.get("instagramUrl") || ""
        ).trim(),

        status: "pending",
        reviewNote: "",
        updatedAt: serverTimestamp(),
      };

      if (editingApplication && application) {
        await updateDoc(
          doc(db, "bandApplications", application.id),
          applicationData
        );
      } else {
        await addDoc(
          collection(db, "bandApplications"),
          {
            ...applicationData,
            createdAt: serverTimestamp(),
          }
        );
      }

      setEditingApplication(false);

      await loadWorkspace(user);

      setMessage(
        "Pengajuan berhasil dikirim. Tunggu verifikasi admin sebelum mengelola lagu."
      );
    } catch (e) {
      console.error("[Band Studio] Submit application error:", e);
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // =========================================================
  // SAVE BAND PROFILE - FIRESTORE FIX
  // =========================================================

  async function saveProfile(e: FormEvent) {
    e.preventDefault();

    if (!user || !band) {
      setMessage("Data akun atau profil band tidak ditemukan.");
      return;
    }

    setBusy(true);
    setMessage("");

    let currentStep = "memvalidasi data profil";

    try {
      // Validasi kepemilikan dokumen
      if (band.ownerUid !== user.uid) {
        throw new Error(
          "UID pemilik band tidak cocok dengan akun yang sedang login."
        );
      }

      // Validasi status verifikasi
      if (band.verificationStatus !== "approved") {
        throw new Error(
          `Band belum berstatus approved. Status saat ini: ${
            band.verificationStatus || "tidak diketahui"
          }`
        );
      }

      currentStep = `membaca ulang dokumen bands/${band.id}`;

      // Ambil data terbaru langsung dari Firestore
      const bandRef = doc(db, "bands", band.id);
      const bandSnap = await getDoc(bandRef);

      if (!bandSnap.exists()) {
        throw new Error(
          "Dokumen band tidak ditemukan di Firestore."
        );
      }

      const latestBand = bandSnap.data();

      // Pastikan pemilik dokumen tidak berubah
      if (latestBand.ownerUid !== user.uid) {
        throw new Error(
          "Dokumen band ini bukan milik akun yang sedang login."
        );
      }

      // Pastikan status verifikasi masih approved
      if (latestBand.verificationStatus !== "approved") {
        throw new Error(
          `Status verifikasi band bukan approved. Status terbaru: ${
            latestBand.verificationStatus || "tidak diketahui"
          }`
        );
      }

      currentStep = "menyimpan perubahan profil ke Firestore";

      // Hanya mengirim field yang diizinkan oleh Firestore Rules
      const editable = {
        name: profileForm.name.trim(),
        slug: slugify(profileForm.name),

        genre: profileForm.genre.trim(),
        origin: profileForm.origin.trim(),
        description: profileForm.description.trim(),

        instagramUrl: profileForm.instagramUrl.trim(),
        websiteUrl: profileForm.websiteUrl.trim(),
        spotifyUrl: profileForm.spotifyUrl.trim(),
        youtubeUrl: profileForm.youtubeUrl.trim(),

        logoUrl: profileForm.logoUrl.trim(),
        coverImageUrl: profileForm.coverImageUrl.trim(),

        updatedAt: serverTimestamp(),
      };

      // PENTING:
      // Gunakan updateDoc karena dokumen sudah ada.
      // Tidak mengubah ownerUid, verificationStatus, atau role.
      await updateDoc(bandRef, editable);

      // Update state lokal setelah Firestore berhasil
      setBand((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          ...editable,
          updatedAt: new Date(),
        };
      });

      setMessage("Profil band berhasil disimpan.");
    } catch (e) {
      const err = e as {
        code?: string;
        message?: string;
      };

      console.error(
        `[Band Studio] Gagal saat ${currentStep}`,
        {
          error: e,
          bandId: band.id,
          loggedInUid: user.uid,
          bandOwnerUid: band.ownerUid,
          verificationStatus: band.verificationStatus,
        }
      );

      const code = err?.code || "unknown";
      const detail =
        err?.message || "Tidak ada detail error.";

      setMessage(
        `Gagal menyimpan profil saat ${currentStep}. Kode: ${code}. ${detail}`
      );
    } finally {
      setBusy(false);
    }
  }

  // =========================================================
  // SAVE SONG
  // =========================================================

  async function saveSong(
    e: FormEvent,
    action: "draft" | "submit"
  ) {
    e.preventDefault();

    if (!user || !band) return;

    setBusy(true);
    setMessage("");

    const title = songForm.title.trim();

    if (!title || !songForm.lyricsWithChords.trim()) {
      setMessage("Judul dan lirik/chord wajib diisi.");
      setBusy(false);
      return;
    }

    try {
      const status =
        action === "submit" ? "pending" : "draft";

      const payload = {
        ownerUid: user.uid,
        bandId: band.id,

        title,
        slug: slugify(title),
        artist: band.name,

        lyricsWithChords:
          songForm.lyricsWithChords.trim(),

        originalKey: songForm.originalKey.trim(),

        bpm: songForm.bpm
          ? Number(songForm.bpm)
          : null,

        capo: songForm.capo
          ? Number(songForm.capo)
          : 0,

        description: songForm.description.trim(),

        coverImageUrl:
          songForm.coverImageUrl.trim(),

        status,
        isPublished: false,

        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (editingSongId) {
        await updateDoc(
          doc(db, "songs", editingSongId),
          payload
        );
      } else {
        await addDoc(
          collection(db, "songs"),
          payload
        );
      }

      setEditingSongId(null);

      setSongForm({
        title: "",
        lyricsWithChords: "",
        originalKey: "",
        bpm: "",
        capo: "0",
        description: "",
        coverImageUrl: "",
      });

      setShowSongForm(false);

      await loadWorkspace(user);

      setMessage(
        action === "submit"
          ? "Lagu masuk antrean review admin. Lagu belum tampil publik sebelum disetujui."
          : "Draft lagu berhasil disimpan."
      );
    } catch (e) {
      console.error("[Band Studio] Save song error:", e);
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // =========================================================
  // SAVE ALBUM
  // =========================================================

  async function saveAlbum(e: FormEvent) {
    e.preventDefault();

    if (!user || !band) return;

    setBusy(true);
    setMessage("");

    try {
      const name = albumForm.name.trim();

      if (!name) {
        throw new Error("Nama album wajib diisi.");
      }

      await addDoc(collection(db, "albums"), {
        ownerUid: user.uid,
        bandId: band.id,
        bandName: band.name,

        name,
        albumName: name,
        slug: slugify(name),

        description: albumForm.description.trim(),
        coverUrl: albumForm.coverUrl.trim(),
        releaseDate: albumForm.releaseDate || "",

        isPublished: false,
        status: "draft",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setAlbumForm({
        name: "",
        description: "",
        coverUrl: "",
        releaseDate: "",
      });

      setShowAlbumForm(false);

      await loadWorkspace(user);

      setMessage("Album draft berhasil dibuat.");
    } catch (e) {
      console.error("[Band Studio] Save album error:", e);
      setMessage(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const publishedCount = useMemo(
    () => songs.filter((s) => s.isPublished).length,
    [songs]
  );

  if (!authReady) {
    return (
      <Screen>
        <div className="flex items-center gap-3 text-white/60">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Memuat Band Studio...
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/60 hover:text-amber-300"
          >
            <ArrowLeft size={15} />
            MELODIX
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/40 sm:block">
              BAND STUDIO
            </span>

            {user && (
              <button
                onClick={() => signOut(auth)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-white/65 hover:border-amber-300/40 hover:text-amber-200"
              >
                <LogOut size={14} />
                Keluar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        {/* PAGE TITLE */}
        <div className="mb-10">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.35em] text-amber-300">
            ARTIST CONTROL ROOM
          </p>

          <h1 className="text-4xl font-black tracking-[-0.06em] sm:text-6xl">
            Band <span className="text-amber-300">Studio.</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Tempat band mengelola identitas, karya, dan rilis.
            Verifikasi band dan publikasi lagu diproses terpisah
            oleh admin Melodix.
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4 text-sm text-amber-100">
            <CircleAlert
              size={17}
              className="mt-0.5 shrink-0"
            />

            <span className="break-words">{message}</span>

            <button
              className="ml-auto"
              onClick={() => setMessage("")}
              aria-label="Tutup pesan"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ================================================== */}
        {/* AUTH SCREEN */}
        {/* ================================================== */}

        {!user ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 sm:p-10">
              <ShieldCheck
                className="mb-6 text-amber-300"
                size={30}
              />

              <h2 className="text-2xl font-bold">
                Masuk ke ruang karyamu.
              </h2>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/45">
                Daftar dengan email, lalu ajukan identitas band.
                Fitur studio akan terbuka setelah admin menyetujui
                pengajuan.
              </p>

              <div className="mt-8 grid gap-3 text-sm text-white/60">
                <div className="flex items-center gap-3">
                  <BadgeCheck
                    size={17}
                    className="text-amber-300"
                  />
                  Profil band terverifikasi
                </div>

                <div className="flex items-center gap-3">
                  <Music2
                    size={17}
                    className="text-amber-300"
                  />
                  Draft dan review lagu
                </div>

                <div className="flex items-center gap-3">
                  <Disc3
                    size={17}
                    className="text-amber-300"
                  />
                  Siapkan rilis dan katalog
                </div>
              </div>
            </div>

            <form
              onSubmit={handleAuth}
              className="rounded-3xl border border-white/10 bg-[#101010] p-6 sm:p-8"
            >
              <div className="mb-6 flex rounded-xl bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${
                    authMode === "register"
                      ? "bg-amber-300 text-black"
                      : "text-white/45"
                  }`}
                >
                  Daftar
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${
                    authMode === "login"
                      ? "bg-amber-300 text-black"
                      : "text-white/45"
                  }`}
                >
                  Masuk
                </button>
              </div>

              <label className={labelClass}>Email</label>

              <input
                className={`${inputClass} mb-5`}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="band@email.com"
              />

              <label className={labelClass}>
                Password (minimal 6 karakter)
              </label>

              <input
                className={`${inputClass} mb-6`}
                type="password"
                required
                minLength={6}
                autoComplete={
                  authMode === "register"
                    ? "new-password"
                    : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />

              <button
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3.5 text-sm font-black text-black transition hover:bg-amber-200 disabled:opacity-50"
              >
                {busy && (
                  <LoaderCircle
                    className="animate-spin"
                    size={17}
                  />
                )}

                {authMode === "register"
                  ? "Buat Akun"
                  : "Masuk ke Studio"}
              </button>

              <p className="mt-4 text-xs leading-5 text-white/30">
                Dengan mendaftar, akun dibuat sebagai fan terlebih
                dahulu. Status band hanya bisa diberikan oleh admin.
              </p>
            </form>
          </div>
        ) : busy && !application && !band ? (
          <div className="rounded-2xl border border-white/10 p-8 text-white/50">
            Memeriksa status akun...
          </div>
        ) : !band ? (
          <>
            {/* APPLICATION STATUS */}
            {application && !editingApplication ? (
              <div className="max-w-3xl rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-9">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35">
                      STATUS PENGAJUAN
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                      {application.bandName}
                    </h2>

                    <p className="mt-2 text-sm text-white/45">
                      {application.genre}{" "}
                      {application.origin
                        ? `· ${application.origin}`
                        : ""}
                    </p>
                  </div>

                  <StatusPill status={application.status} />
                </div>

                <p className="mt-6 max-w-2xl text-sm leading-6 text-white/55">
                  {application.status === "pending"
                    ? "Pengajuanmu sedang menunggu pemeriksaan admin. Kamu belum bisa membuat atau mengirim lagu."
                    : application.status === "needs_changes"
                    ? "Admin meminta perubahan. Periksa catatan di bawah dan ajukan kembali setelah memperbaiki informasi."
                    : application.status === "rejected"
                    ? "Pengajuan belum disetujui. Baca catatan admin untuk memahami alasannya."
                    : "Pengajuan disetujui. Silakan keluar lalu masuk kembali jika studio belum terbuka."}
                </p>

                {application.reviewNote && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                    <b className="mb-1 block text-xs uppercase tracking-widest text-amber-300">
                      Catatan admin
                    </b>

                    {application.reviewNote}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => user && loadWorkspace(user)}
                    type="button"
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:border-amber-300/40"
                  >
                    Perbarui status
                  </button>

                  {(application.status === "needs_changes" ||
                    application.status === "rejected") && (
                    <button
                      type="button"
                      onClick={() => setEditingApplication(true)}
                      className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-black"
                    >
                      Edit & ajukan ulang
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* APPLICATION FORM */
              <form
                onSubmit={submitApplication}
                className="max-w-4xl rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-9"
              >
                <div className="mb-8">
                  <h2 className="text-2xl font-black">
                    {editingApplication
                      ? "Perbaiki pengajuan band."
                      : "Ajukan band kamu."}
                  </h2>

                  <p className="mt-2 text-sm text-white/45">
                    Isi informasi yang bisa diverifikasi. Setelah
                    disetujui, studio band akan aktif.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nama band *">
                    <input
                      name="bandName"
                      className={inputClass}
                      required
                      defaultValue={
                        editingApplication
                          ? application?.bandName || ""
                          : ""
                      }
                      placeholder="Nama band"
                    />
                  </Field>

                  <Field label="Slug profil">
                    <input
                      name="slug"
                      className={inputClass}
                      defaultValue={
                        editingApplication
                          ? application?.slug || ""
                          : ""
                      }
                      placeholder="otomatis dari nama band"
                    />
                  </Field>

                  <Field label="Genre utama *">
                    <input
                      name="genre"
                      className={inputClass}
                      required
                      defaultValue={
                        editingApplication
                          ? application?.genre || ""
                          : ""
                      }
                      placeholder="Alternative rock, pop..."
                    />
                  </Field>

                  <Field label="Kota / asal">
                    <input
                      name="origin"
                      className={inputClass}
                      defaultValue={
                        editingApplication
                          ? application?.origin || ""
                          : ""
                      }
                      placeholder="Pelabuhanratu, Sukabumi"
                    />
                  </Field>

                  <Field label="Email kontak">
                    <input
                      name="contactEmail"
                      className={inputClass}
                      type="email"
                      defaultValue={
                        editingApplication
                          ? application?.contactEmail ||
                            user.email ||
                            ""
                          : user.email || ""
                      }
                      placeholder="contact@band.com"
                    />
                  </Field>

                  <Field label="Instagram band">
                    <input
                      name="instagramUrl"
                      className={inputClass}
                      type="url"
                      defaultValue={
                        editingApplication
                          ? application?.instagramUrl || ""
                          : ""
                      }
                      placeholder="https://instagram.com/..."
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Deskripsi band *">
                      <textarea
                        name="description"
                        className={`${inputClass} min-h-32 resize-y`}
                        required
                        minLength={20}
                        defaultValue={
                          editingApplication
                            ? application?.description || ""
                            : ""
                        }
                        placeholder="Ceritakan identitas band, personel, dan karya kalian..."
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-black text-black hover:bg-amber-200 disabled:opacity-50"
                  >
                    <Send size={16} />

                    {editingApplication
                      ? "Kirim ulang pengajuan"
                      : "Kirim pengajuan"}
                  </button>

                  {editingApplication && (
                    <button
                      type="button"
                      onClick={() => setEditingApplication(false)}
                      className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/50"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            )}
          </>
        ) : (
          <>
            {/* ================================================== */}
            {/* BAND DASHBOARD */}
            {/* ================================================== */}

            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-300/20 bg-gradient-to-r from-amber-300/[0.09] to-transparent p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-200">
                  <Music2 size={25} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black">
                      {band.name}
                    </h2>

                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                      <BadgeCheck size={12} />
                      Verified
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-white/40">
                    {band.genre || "Genre belum diatur"}{" "}
                    {band.origin ? `· ${band.origin}` : ""}
                  </p>
                </div>
              </div>

              <Link
                href={`/band/${band.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-white/65 hover:border-amber-300/40 hover:text-amber-200"
              >
                Lihat profil publik
                <ExternalLink size={14} />
              </Link>
            </div>

            {/* TABS */}
            <nav className="mb-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
              {(
                [
                  ["overview", "Overview"],
                  ["profile", "Profil band"],
                  ["songs", "Lagu & lirik"],
                  ["albums", "Album & rilisan"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-black transition ${
                    tab === id
                      ? "bg-amber-300 text-black"
                      : "text-white/45 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* ================================================== */}
            {/* OVERVIEW */}
            {/* ================================================== */}

            {tab === "overview" && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Metric
                    icon={<Music2 size={18} />}
                    label="Total lagu"
                    value={songs.length}
                  />

                  <Metric
                    icon={<BadgeCheck size={18} />}
                    label="Tayang publik"
                    value={publishedCount}
                  />

                  <Metric
                    icon={<Disc3 size={18} />}
                    label="Perlu review"
                    value={
                      songs.filter(
                        (s) => s.status === "pending"
                      ).length
                    }
                  />
                </div>

                <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                  <section className="rounded-3xl border border-white/10 p-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black">
                        Aktivitas karya
                      </h3>

                      <button
                        onClick={() => {
                          setTab("songs");
                          setShowSongForm(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-2 text-xs font-black text-black"
                      >
                        <Plus size={14} />
                        Tambah lagu
                      </button>
                    </div>

                    {songs.length ? (
                      <div className="mt-5 space-y-3">
                        {songs.slice(0, 4).map((song) => (
                          <SongRow
                            key={song.id}
                            song={song}
                          />
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title="Belum ada lagu"
                        text="Mulai dengan menyimpan draft lirik dan chord pertamamu."
                      />
                    )}
                  </section>

                  <section className="rounded-3xl border border-white/10 p-6">
                    <h3 className="text-lg font-black">
                      Checklist profil
                    </h3>

                    <div className="mt-5 space-y-4">
                      {[
                        [!!band.description, "Deskripsi band"],
                        [!!band.genre, "Genre"],
                        [!!band.coverImageUrl, "Cover profil"],
                        [!!band.instagramUrl, "Link sosial"],
                      ].map(([ok, label]) => (
                        <div
                          key={String(label)}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full ${
                              ok
                                ? "bg-emerald-400/15 text-emerald-300"
                                : "bg-white/5 text-white/25"
                            }`}
                          >
                            {ok ? "✓" : "·"}
                          </span>

                          <span
                            className={
                              ok
                                ? "text-white/65"
                                : "text-white/35"
                            }
                          >
                            {String(label)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setTab("profile")}
                      className="mt-6 text-xs font-black text-amber-300 hover:text-amber-200"
                    >
                      Lengkapi profil →
                    </button>
                  </section>
                </div>
              </>
            )}

            {/* ================================================== */}
            {/* PROFILE */}
            {/* ================================================== */}

            {tab === "profile" && (
              <form
                onSubmit={saveProfile}
                className="rounded-3xl border border-white/10 p-6 sm:p-8"
              >
                <h3 className="text-xl font-black">
                  Edit profil band
                </h3>

                <p className="mb-7 mt-2 text-sm text-white/40">
                  Perubahan profil langsung disimpan. Status
                  verifikasi tidak dapat diubah dari sini.
                </p>

                <div className="grid gap-5 sm:grid-cols-2">
                  {(
                    [
                      ["name", "Nama band *"],
                      ["genre", "Genre"],
                      ["origin", "Asal"],
                      ["instagramUrl", "Instagram URL"],
                      ["websiteUrl", "Website URL"],
                      ["spotifyUrl", "Spotify URL"],
                      ["youtubeUrl", "YouTube URL"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        className={inputClass}
                        required={key === "name"}
                        type={
                          key.endsWith("Url") ? "url" : "text"
                        }
                        value={profileForm[key]}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            [key]: e.target.value,
                          })
                        }
                        placeholder={label}
                      />
                    </Field>
                  ))}

                  <div className="grid gap-4 sm:col-span-2 md:grid-cols-2">
                    <GitHubImageUpload
                      label="Logo band"
                      kind="band-logo"
                      bandId={band?.id}
                      value={profileForm.logoUrl}
                      onChange={(logoUrl) =>
                        setProfileForm((v) => ({
                          ...v,
                          logoUrl,
                        }))
                      }
                    />

                    <GitHubImageUpload
                      label="Cover profil band"
                      kind="band-cover"
                      bandId={band?.id}
                      value={profileForm.coverImageUrl}
                      onChange={(coverImageUrl) =>
                        setProfileForm((v) => ({
                          ...v,
                          coverImageUrl,
                        }))
                      }
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Field label="Deskripsi">
                      <textarea
                        className={`${inputClass} min-h-32 resize-y`}
                        value={profileForm.description}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Tentang band..."
                      />
                    </Field>
                  </div>
                </div>

                <button
                  disabled={busy}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-black disabled:opacity-50"
                >
                  {busy ? (
                    <LoaderCircle
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={16} />
                  )}

                  Simpan profil
                </button>
              </form>
            )}

            {/* ================================================== */}
            {/* ALBUMS */}
            {/* ================================================== */}

            {tab === "albums" && (
              <section className="rounded-3xl border border-white/10 p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black">
                      Album & rilisan
                    </h3>

                    <p className="mt-2 text-sm text-white/40">
                      Siapkan metadata album. Album tersimpan
                      sebagai draft dan belum tayang publik.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAlbumForm((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-black"
                  >
                    <Plus size={15} />
                    Buat album
                  </button>
                </div>

                {showAlbumForm && (
                  <form
                    onSubmit={saveAlbum}
                    className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Nama album *">
                        <input
                          className={inputClass}
                          required
                          value={albumForm.name}
                          onChange={(e) =>
                            setAlbumForm({
                              ...albumForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Nama album"
                        />
                      </Field>

                      <Field label="Tanggal rilis (opsional)">
                        <input
                          className={inputClass}
                          type="date"
                          value={albumForm.releaseDate}
                          onChange={(e) =>
                            setAlbumForm({
                              ...albumForm,
                              releaseDate: e.target.value,
                            })
                          }
                        />
                      </Field>

                      <GitHubImageUpload
                        label="Cover album"
                        kind="album-cover"
                        bandId={band?.id}
                        value={albumForm.coverUrl}
                        onChange={(coverUrl) =>
                          setAlbumForm((v) => ({
                            ...v,
                            coverUrl,
                          }))
                        }
                      />

                      <div className="sm:col-span-2">
                        <Field label="Deskripsi">
                          <textarea
                            className={`${inputClass} min-h-24 resize-y`}
                            value={albumForm.description}
                            onChange={(e) =>
                              setAlbumForm({
                                ...albumForm,
                                description: e.target.value,
                              })
                            }
                            placeholder="Konsep atau catatan rilisan"
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        disabled={busy}
                        className="rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-black disabled:opacity-50"
                      >
                        Simpan album draft
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAlbumForm(false)}
                        className="rounded-xl px-4 py-3 text-xs text-white/40"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                )}

                {albums.length ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {albums.map((album) => (
                      <div
                        key={album.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-amber-300">
                            {album.coverUrl ? (
                              <img
                                src={album.coverUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Disc3 size={20} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold">
                              {album.name}
                            </p>

                            <p className="mt-1 text-xs text-white/35">
                              {album.releaseDate ||
                                "Tanggal rilis belum ditentukan"}
                            </p>

                            <div className="mt-2">
                              <StatusPill
                                status={
                                  album.isPublished
                                    ? "published"
                                    : "draft"
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {album.description && (
                          <p className="mt-3 text-xs leading-5 text-white/45">
                            {album.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Belum ada album"
                    text="Buat draft album untuk mulai menyiapkan rilisan band."
                  />
                )}
              </section>
            )}

            {/* ================================================== */}
            {/* SONGS */}
            {/* ================================================== */}

            {tab === "songs" && (
              <section className="rounded-3xl border border-white/10 p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black">
                      Katalog lagu
                    </h3>

                    <p className="mt-2 text-sm text-white/40">
                      Lagu baru disimpan sebagai draft atau
                      dikirim ke antrean review admin.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingSongId(null);

                      setSongForm({
                        title: "",
                        lyricsWithChords: "",
                        originalKey: "",
                        bpm: "",
                        capo: "0",
                        description: "",
                        coverImageUrl: "",
                      });

                      setShowSongForm((v) => !v);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-black"
                  >
                    <Plus size={15} />
                    Tulis lagu
                  </button>
                </div>

                {showSongForm && (
                  <form
                    onSubmit={(e) => saveSong(e, "draft")}
                    className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-5"
                  >
                    <h4 className="mb-5 font-black">
                      {editingSongId ? "Edit lagu" : "Editor lagu"}
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Judul lagu *">
                        <input
                          className={inputClass}
                          required
                          value={songForm.title}
                          onChange={(e) =>
                            setSongForm({
                              ...songForm,
                              title: e.target.value,
                            })
                          }
                          placeholder="Judul lagu"
                        />
                      </Field>

                      <Field label="Nada dasar">
                        <input
                          className={inputClass}
                          value={songForm.originalKey}
                          onChange={(e) =>
                            setSongForm({
                              ...songForm,
                              originalKey: e.target.value,
                            })
                          }
                          placeholder="Em, C, F#m..."
                        />
                      </Field>

                      <Field label="BPM">
                        <input
                          className={inputClass}
                          type="number"
                          min="1"
                          max="400"
                          value={songForm.bpm}
                          onChange={(e) =>
                            setSongForm({
                              ...songForm,
                              bpm: e.target.value,
                            })
                          }
                          placeholder="124"
                        />
                      </Field>

                      <Field label="Capo fret">
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          max="24"
                          value={songForm.capo}
                          onChange={(e) =>
                            setSongForm({
                              ...songForm,
                              capo: e.target.value,
                            })
                          }
                        />
                      </Field>

                      <div className="sm:col-span-2">
                        <Field label="Lirik + chord *">
                          <textarea
                            className={`${inputClass} min-h-64 resize-y font-mono text-xs leading-6`}
                            required
                            value={songForm.lyricsWithChords}
                            onChange={(e) =>
                              setSongForm({
                                ...songForm,
                                lyricsWithChords: e.target.value,
                              })
                            }
                            placeholder={
                              "[Verse 1]\n[Em]Write lyrics here...\n[C]Chords in square brackets"
                            }
                          />
                        </Field>

                        <p className="mt-2 text-[11px] text-white/30">
                          Format chord: [Em]lirik. Simpan draft
                          dulu untuk merapikan, atau kirim ke admin
                          untuk review publikasi.
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <GitHubImageUpload
                          label="Cover lagu"
                          kind="song-cover"
                          bandId={band.id}
                          value={songForm.coverImageUrl}
                          onChange={(coverImageUrl) =>
                            setSongForm((v) => ({
                              ...v,
                              coverImageUrl,
                            }))
                          }
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Field label="Catatan lagu">
                          <textarea
                            className={`${inputClass} min-h-20 resize-y`}
                            value={songForm.description}
                            onChange={(e) =>
                              setSongForm({
                                ...songForm,
                                description: e.target.value,
                              })
                            }
                            placeholder="Cerita singkat atau catatan produksi (opsional)"
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-black text-white/75"
                      >
                        <Save size={14} />
                        Simpan draft
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                          const form = (
                            e.currentTarget as HTMLButtonElement
                          ).closest("form");

                          if (form) {
                            void saveSong(
                              {
                                preventDefault: () => {},
                                currentTarget: form,
                              } as unknown as FormEvent,
                              "submit"
                            );
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-black disabled:opacity-50"
                      >
                        <Send size={14} />
                        Ajukan publikasi
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSongForm(false)}
                        className="rounded-xl px-4 py-3 text-xs text-white/40"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                )}

                {songs.length ? (
                  <div className="mt-6 space-y-3">
                    {songs.map((song) => (
                      <SongRow
                        key={song.id}
                        song={song}
                        onEdit={() => {
                          if (song.isPublished) return;

                          setEditingSongId(song.id);

                          setSongForm({
                            title: song.title || "",
                            lyricsWithChords:
                              song.lyricsWithChords || "",
                            originalKey: song.originalKey || "",
                            bpm: song.bpm
                              ? String(song.bpm)
                              : "",
                            capo:
                              song.capo != null
                                ? String(song.capo)
                                : "0",
                            description: "",
                            coverImageUrl:
                              song.coverImageUrl || "",
                          });

                          setShowSongForm(true);

                          window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Katalog masih kosong"
                    text="Buat draft pertama atau ajukan lagu untuk ditinjau admin."
                  />
                )}
              </section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/10 px-5 py-7 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-white/25">
        MELODIX · Band Studio
      </footer>
    </Screen>
  );
}

// =========================================================
// REUSABLE COMPONENTS
// =========================================================

function Screen({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-48 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-amber-300/[0.045] blur-[150px]" />

        <div className="absolute bottom-0 right-0 h-[300px] w-[400px] rounded-full bg-amber-300/[0.025] blur-[140px]" />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="mb-4 text-amber-300">{icon}</div>

      <p className="text-3xl font-black">{value}</p>

      <p className="mt-1 text-xs text-white/40">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:
      "border-amber-300/20 bg-amber-300/10 text-amber-200",

    approved:
      "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",

    rejected:
      "border-red-300/20 bg-red-300/10 text-red-200",

    needs_changes:
      "border-sky-300/20 bg-sky-300/10 text-sky-200",

    draft:
      "border-white/10 bg-white/5 text-white/50",

    published:
      "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
  };

  const labels: Record<string, string> = {
    pending: "Menunggu review",
    approved: "Disetujui",
    rejected: "Ditolak",
    needs_changes: "Perlu revisi",
    draft: "Draft",
    published: "Tayang",
    submitted: "Diajukan",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
        map[status] || map.draft
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function SongRow({
  song,
  onEdit,
}: {
  song: StudioSong;
  onEdit?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-amber-300">
          <Music2 size={17} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {song.title}
          </p>

          <p className="mt-1 text-[11px] text-white/35">
            {song.originalKey || "Key —"} ·{" "}
            {song.bpm || "—"} BPM
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <StatusPill
          status={
            song.isPublished
              ? "published"
              : song.status || "draft"
          }
        />

        {!song.isPublished && onEdit && (
          <button
            onClick={onEdit}
            className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold text-white/60 hover:border-amber-300/30 hover:text-amber-200"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function Empty({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/25">
        <Users size={20} />
      </div>

      <p className="font-bold text-white/75">{title}</p>

      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/35">
        {text}
      </p>
    </div>
  );
}

// =========================================================
// ERROR HANDLER
// =========================================================

function errorText(e: unknown) {
  const error = e as {
    code?: string;
    message?: string;
  };

  const code = error?.code || "";

  if (code.includes("auth/email-already-in-use")) {
    return "Email sudah terdaftar. Coba masuk.";
  }

  if (code.includes("auth/invalid-credential")) {
    return "Email atau password tidak cocok.";
  }

  if (code.includes("auth/weak-password")) {
    return "Password minimal 6 karakter.";
  }

  if (code.includes("permission-denied")) {
    return `Akses Firestore ditolak (${code}). Periksa Firestore Rules dan izin dokumen yang sedang diakses.`;
  }

  return error?.message || "Terjadi kesalahan. Coba lagi.";
}
