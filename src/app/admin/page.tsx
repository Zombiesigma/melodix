
"use client";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  Activity,
  BadgeCheck,
  Ban,
  Bell,
  Check,
  ChevronRight,
  CircleAlert,
  Disc3,
  ExternalLink,
  FileMusic,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Music2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";

// =========================================================
// TYPES
// =========================================================

type Row = Record<string, any> & { id: string };

type Section =
  | "overview"
  | "applications"
  | "songs"
  | "bands"
  | "albums"
  | "users"
  | "announcements";

type ActionType =
  | "publish"
  | "draft"
  | "approve"
  | "reject"
  | "suspend"
  | "activate"
  | "delete";

const COLLECTIONS = [
  "bandApplications",
  "songs",
  "bands",
  "albums",
  "users",
  "announcements",
] as const;

const NAV: {
  id: Section;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
  { id: "applications", label: "Pengajuan band", icon: BadgeCheck },
  { id: "songs", label: "Semua lagu", icon: Music2 },
  { id: "bands", label: "Manajemen band", icon: Users },
  { id: "albums", label: "Album", icon: Disc3 },
  { id: "users", label: "Pengguna", icon: ShieldCheck },
  { id: "announcements", label: "Pengumuman", icon: Bell },
];

const INPUT =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-amber-300/60";

const titleOf = (r: Row) =>
  String(
    r.title ||
      r.bandName ||
      r.name ||
      r.displayName ||
      r.email ||
      r.id
  );

const statusOf = (r: Row) =>
  String(
    r.status ||
      (r.isPublished ? "published" : "draft")
  );

const COLLECTION_MAP: Record<
  Exclude<Section, "overview">,
  string
> = {
  applications: "bandApplications",
  songs: "songs",
  bands: "bands",
  albums: "albums",
  users: "users",
  announcements: "announcements",
};

const SECTION_TITLES: Record<Section, string> = {
  overview: "Ringkasan platform",
  applications: "Review pengajuan band",
  songs: "Kontrol publikasi lagu",
  bands: "Manajemen band",
  albums: "Manajemen album",
  users: "Manajemen pengguna",
  announcements: "Pengumuman platform",
};

// =========================================================
// MAIN ADMIN
// =========================================================

export default function AdminControlCenter() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [section, setSection] = useState<Section>("overview");

  const [data, setData] = useState<Record<string, Row[]>>({});
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");

  // =======================================================
  // AUTH + ADMIN VERIFICATION
  // =======================================================

  const verify = useCallback(async (u: User | null) => {
    setUser(u);
    setAdmin(false);
    setData({});
    setLoadErrors([]);
    setError("");

    if (!u) return;

    try {
      const snap = await getDoc(
        doc(db, "admins", u.uid)
      );

      const isAuthorized =
        snap.exists() && snap.data().active === true;

      setAdmin(isAuthorized);

      if (!isAuthorized) {
        setError(
          "Akun ini belum memiliki akses admin aktif."
        );
      }
    } catch (e) {
      console.error("[Admin] Verification error:", e);

      setError(
        "Gagal memverifikasi admin. Periksa dokumen admins/{UID} dan Firestore Rules."
      );
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setReady(true);
      void verify(u);
    });

    return unsubscribe;
  }, [verify]);

  // =======================================================
  // LOAD COLLECTIONS
  // =======================================================

  const load = useCallback(async () => {
    if (!user || !admin) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const nextData: Record<string, Row[]> = {};
    const errors: string[] = [];

    try {
      await Promise.all(
        COLLECTIONS.map(async (name) => {
          try {
            const snap = await getDocs(
              query(
                collection(db, name),
                limit(150)
              )
            );

            nextData[name] = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as Row[];
          } catch (e) {
            console.error(
              `[Admin] Failed loading ${name}:`,
              e
            );

            nextData[name] = [];
            errors.push(name);
          }
        })
      );

      setData(nextData);
      setLoadErrors(errors);

      if (errors.length) {
        setError(
          `Sebagian koleksi gagal dimuat: ${errors.join(
            ", "
          )}. Periksa Firestore Rules.`
        );
      }
    } catch (e) {
      console.error("[Admin] Load error:", e);
      setError("Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user, admin]);

  useEffect(() => {
    if (admin && user) {
      void load();
    }
  }, [admin, user, load]);

  // =======================================================
  // DATA HELPERS
  // =======================================================

  const all = useMemo(() => {
    if (section === "overview") {
      return data.songs || [];
    }

    return data[COLLECTION_MAP[section]] || [];
  }, [data, section]);

  const visible = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return all;

    return all.filter((r) =>
      [
        titleOf(r),
        r.email,
        r.artist,
        r.status,
        r.ownerEmail,
        r.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [all, search]);

  const counts = useMemo(() => {
    const applications = data.bandApplications || [];
    const songs = data.songs || [];
    const bands = data.bands || [];
    const users = data.users || [];
    const albums = data.albums || [];

    return [
      {
        label: "Lagu",
        value: songs.length,
        icon: Music2,
      },
      {
        label: "Band",
        value: bands.length,
        icon: Users,
      },
      {
        label: "Pengajuan",
        value: applications.filter(
          (x) =>
            x.status === "pending" ||
            x.status === "needs_changes"
        ).length,
        icon: BadgeCheck,
      },
      {
        label: "Pengguna",
        value: users.length,
        icon: ShieldCheck,
      },
      {
        label: "Album",
        value: albums.length,
        icon: Disc3,
      },
    ];
  }, [data]);

  // =======================================================
  // LOGIN
  // =======================================================

  async function login(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
    } catch (e) {
      console.error("[Admin] Login error:", e);

      setError(
        e instanceof Error
          ? e.message
          : "Login gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  // =======================================================
  // LOGOUT
  // =======================================================

  async function logout() {
    try {
      await signOut(auth);
      setData({});
      setAdmin(false);
      setSection("overview");
    } catch (e) {
      console.error(e);
      setError("Gagal keluar dari akun.");
    }
  }

  // =======================================================
  // AUDIT LOG
  // =======================================================

  function addAuditToBatch(
    batch: ReturnType<typeof writeBatch>,
    action: string,
    col: string,
    row: Row,
    actorUid: string
  ) {
    const auditRef = doc(
      collection(db, "adminAuditLogs")
    );

    batch.set(auditRef, {
      actorUid,
      action,
      collection: col,
      documentId: row.id,
      itemTitle: titleOf(row),
      createdAt: serverTimestamp(),
    });
  }

  // =======================================================
  // MUTATION / ADMIN ACTIONS
  // =======================================================

  async function mutate(
    col: string,
    row: Row,
    action: ActionType
  ) {
    if (!user || !admin) return;

    const key = `${col}/${row.id}`;

    setBusy(key);
    setError("");
    setSuccess("");

    try {
      if (action === "delete") {
        const confirmed = window.confirm(
          `Hapus permanen "${titleOf(row)}"? Tindakan ini tidak dapat dibatalkan.`
        );

        if (!confirmed) return;
      }

      let reviewNote = "";

      if (action === "reject") {
        const answer = window.prompt(
          "Masukkan alasan penolakan pengajuan:"
        );

        reviewNote = answer?.trim() || "";

        if (!reviewNote) {
          setError(
            "Penolakan dibatalkan. Alasan wajib diisi."
          );
          return;
        }
      }

      const batch = writeBatch(db);
      const targetRef = doc(db, col, row.id);

      // DELETE
      if (action === "delete") {
        batch.delete(targetRef);
      }

      // APPROVE APPLICATION
      else if (
        col === "bandApplications" &&
        action === "approve"
      ) {
        if (!row.ownerUid) {
          throw new Error(
            "Pengajuan tidak memiliki ownerUid."
          );
        }

        const bandId = row.id;

        const bandRef = doc(db, "bands", bandId);
        const userRef = doc(
          db,
          "users",
          row.ownerUid
        );

        // Create or update band document.
        batch.set(
          bandRef,
          {
            name: row.bandName || row.name || "Band",
            slug: row.slug || bandId,
            genre: row.genre || "",
            origin: row.origin || "",
            description: row.description || "",
            instagramUrl: row.instagramUrl || "",

            ownerUid: row.ownerUid,
            verificationStatus: "approved",
            isPublished: true,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Promote owner to band account.
        // This assumes the user document already exists.
        batch.set(
          userRef,
          {
            role: "band",
            bandId,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Update application.
        batch.update(targetRef, {
          status: "approved",
          bandId,
          reviewNote: "",
          reviewedBy: user.uid,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // OTHER ACTIONS
      else {
        const patch: Record<string, any> = {
          updatedAt: serverTimestamp(),
          adminUpdatedBy: user.uid,
        };

        if (
          action === "publish" ||
          action === "approve"
        ) {
          patch.isPublished = true;

          patch.status =
            action === "approve" &&
            col === "bandApplications"
              ? "approved"
              : "published";
        }

        if (action === "draft") {
          patch.isPublished = false;
          patch.status = "draft";
        }

        if (action === "reject") {
          patch.isPublished = false;
          patch.status = "rejected";
          patch.reviewNote = reviewNote;
          patch.reviewedBy = user.uid;
          patch.reviewedAt = serverTimestamp();
        }

        if (action === "suspend") {
          patch.isSuspended = true;
          patch.status = "suspended";
        }

        if (action === "activate") {
          patch.isSuspended = false;
          patch.status = "active";
        }

        batch.update(targetRef, patch);
      }

      // AUDIT LOG
      addAuditToBatch(
        batch,
        action,
        col,
        row,
        user.uid
      );

      // Commit all operations atomically.
      await batch.commit();

      setSuccess(
        actionSuccessMessage(action, titleOf(row))
      );

      await load();
    } catch (e) {
      console.error(
        `[Admin] Action ${action} failed:`,
        e
      );

      const err = e as {
        code?: string;
        message?: string;
      };

      setError(
        `Aksi ${action} gagal pada ${col}/${row.id}. ${
          err.code || ""
        } ${err.message || "Periksa Firestore Rules."}`
      );
    } finally {
      setBusy("");
    }
  }

  // =======================================================
  // CREATE ANNOUNCEMENT
  // =======================================================

  async function createAnnouncement(
    e: FormEvent
  ) {
    e.preventDefault();

    if (
      !user ||
      !admin ||
      !noticeTitle.trim() ||
      !noticeBody.trim()
    ) {
      return;
    }

    setBusy("announcement");
    setError("");
    setSuccess("");

    try {
      await addDoc(collection(db, "announcements"), {
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
        isPublished: true,
        status: "published",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNoticeTitle("");
      setNoticeBody("");

      setSuccess("Pengumuman berhasil dipublikasikan.");

      await load();
    } catch (e) {
      console.error(
        "[Admin] Announcement error:",
        e
      );

      const err = e as {
        code?: string;
        message?: string;
      };

      setError(
        `Pengumuman gagal dibuat. ${err.code || ""} ${
          err.message || ""
        }`
      );
    } finally {
      setBusy("");
    }
  }

  // =======================================================
  // LOADING SCREEN
  // =======================================================

  if (!ready) {
    return (
      <main className="min-h-screen bg-black p-8 text-white/50">
        <LoaderCircle className="inline animate-spin" size={18} />
        <span className="ml-2">Memeriksa sesi admin...</span>
      </main>
    );
  }

  // =======================================================
  // LOGIN SCREEN
  // =======================================================

  if (!user) {
    return (
      <main className="min-h-screen bg-[#080808] px-5 py-16 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-7 sm:p-9">
          <p className="text-[10px] font-black uppercase tracking-[.35em] text-amber-300">
            MELODIX · ROOT ADMIN
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Control <span className="text-amber-300">Center.</span>
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/45">
            Masuk menggunakan akun Firebase Authentication
            yang UID-nya terdaftar pada koleksi admins.
          </p>

          {error && (
            <Alert type="error">{error}</Alert>
          )}

          <form
            onSubmit={login}
            className="mt-7 space-y-4"
          >
            <label className="block text-xs text-white/50">
              Email

              <input
                className={`${INPUT} mt-2`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>

            <label className="block text-xs text-white/50">
              Password

              <input
                className={`${INPUT} mt-2`}
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                autoComplete="current-password"
              />
            </label>

            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 py-3 font-black text-black disabled:opacity-50"
            >
              {loading && (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              )}

              {loading ? "Memproses..." : "Masuk ke Admin"}
            </button>
          </form>

          <Link
            href="/"
            className="mt-5 block text-center text-xs text-white/40 hover:text-amber-200"
          >
            ← Kembali ke Melodix
          </Link>
        </div>
      </main>
    );
  }

  // =======================================================
  // ACCESS DENIED
  // =======================================================

  if (!admin) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto mt-20 max-w-xl rounded-3xl border border-red-300/20 bg-red-300/[.04] p-7">
          <CircleAlert className="text-red-300" />

          <h1 className="mt-4 text-2xl font-black">
            Akses ditolak
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/50">
            Akun ini belum terdaftar sebagai admin aktif.
            Periksa dokumen admins/{user.uid}.
          </p>

          <p className="mt-3 break-all font-mono text-xs text-white/35">
            UID: {user.uid}
          </p>

          {error && (
            <p className="mt-3 text-xs text-red-200">
              {error}
            </p>
          )}

          <button
            onClick={logout}
            className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-sm"
          >
            Keluar
          </button>
        </div>
      </main>
    );
  }

  // =======================================================
  // ADMIN DASHBOARD
  // =======================================================

  return (
    <main className="min-h-screen bg-[#080808] text-white">

      {/* DESKTOP SIDEBAR */}

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/10 bg-[#0b0b0b] p-5 lg:flex">
        <Link
          href="/"
          className="flex items-center gap-3 border-b border-white/10 pb-6"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-lg font-black text-black">
            M
          </span>

          <span>
            <b className="block text-sm tracking-[.2em]">
              MELODIX
            </b>

            <small className="text-[10px] uppercase tracking-widest text-amber-300">
              Root Admin
            </small>
          </span>
        </Link>

        <nav className="mt-6 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;

            return (
              <NavButton
                key={item.id}
                active={section === item.id}
                onClick={() => {
                  setSection(item.id);
                  setSearch("");
                  setError("");
                }}
                icon={<Icon size={17} />}
                label={item.label}
                badge={
                  item.id === "applications"
                    ? counts[2].value
                    : undefined
                }
              />
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-amber-300/15 bg-amber-300/[.04] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">
            Admin aktif
          </p>

          <p className="mt-2 truncate text-xs text-white/60">
            {user.email}
          </p>

          <p className="mt-1 break-all text-[10px] text-white/25">
            {user.uid}
          </p>

          <button
            onClick={logout}
            className="mt-4 flex items-center gap-2 text-xs text-white/40 hover:text-white"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </aside>

      {/* MAIN AREA */}

      <section className="lg:pl-64">

        {/* HEADER */}

        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080808]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.3em] text-amber-300">
              MELODIX / ADMIN
            </p>

            <h1 className="mt-1 text-lg font-black sm:text-xl">
              {SECTION_TITLES[section]}
            </h1>
          </div>

          <div className="flex gap-2">
            <Link
              href="/admin/music-studio"
              className="hidden items-center gap-2 rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-black sm:flex"
            >
              <Plus size={14} />
              Music Studio
            </Link>

            <button
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-white/10 p-2.5 text-white/50 hover:text-amber-200 disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>
        </header>

        {/* MOBILE NAV */}

        <div className="border-b border-white/10 px-4 py-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSection(item.id);
                  setSearch("");
                  setError("");
                }}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${
                  section === item.id
                    ? "bg-amber-300 text-black"
                    : "bg-white/5 text-white/50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Link
            href="/admin/music-studio"
            className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-amber-200"
          >
            <Plus size={14} />
            Buka Music Studio
          </Link>
        </div>

        {/* CONTENT */}

        <div className="mx-auto max-w-7xl p-4 sm:p-8">

          {error && (
            <Alert
              type="error"
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              type="success"
              onClose={() => setSuccess("")}
            >
              {success}
            </Alert>
          )}

          {loadErrors.length > 0 && (
            <div className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3 text-xs text-amber-100">
              Data berikut belum berhasil dimuat:{" "}
              {loadErrors.join(", ")}
            </div>
          )}

          {/* OVERVIEW */}

          {section === "overview" && (
            <Overview
              data={data}
              counts={counts}
              loading={loading}
              onNavigate={setSection}
            />
          )}

          {/* ANNOUNCEMENTS */}

          {section === "announcements" && (
            <>
              <form
                onSubmit={createAnnouncement}
                className="mb-6 max-w-3xl rounded-2xl border border-white/10 p-5"
              >
                <h2 className="font-black">
                  Buat pengumuman
                </h2>

                <input
                  className={`${INPUT} mt-4`}
                  value={noticeTitle}
                  onChange={(e) =>
                    setNoticeTitle(e.target.value)
                  }
                  placeholder="Judul pengumuman"
                  required
                />

                <textarea
                  className={`${INPUT} mt-3 min-h-28 resize-y`}
                  value={noticeBody}
                  onChange={(e) =>
                    setNoticeBody(e.target.value)
                  }
                  placeholder="Isi pengumuman untuk pengguna Melodix..."
                  required
                />

                <button
                  disabled={busy === "announcement"}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-black disabled:opacity-50"
                >
                  {busy === "announcement" && (
                    <LoaderCircle
                      size={14}
                      className="animate-spin"
                    />
                  )}

                  Publikasikan
                </button>
              </form>

              <Records
                rows={visible}
                collectionName="announcements"
                busy={busy}
                onAction={mutate}
              />
            </>
          )}

          {/* OTHER COLLECTIONS */}

          {section !== "overview" &&
            section !== "announcements" && (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                  <label className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-3 text-white/30"
                    />

                    <input
                      className={`${INPUT} pl-9`}
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Cari nama, email, artis, status..."
                    />
                  </label>

                  <span className="self-center text-xs text-white/35">
                    {visible.length} data ditampilkan
                    {" · "}
                    maksimal 150 per koleksi
                  </span>
                </div>

                {loading ? (
                  <div className="flex items-center gap-2 py-16 text-sm text-white/40">
                    <LoaderCircle
                      size={17}
                      className="animate-spin"
                    />
                    Memuat data...
                  </div>
                ) : (
                  <Records
                    rows={visible}
                    collectionName={COLLECTION_MAP[section]}
                    busy={busy}
                    onAction={mutate}
                  />
                )}
              </>
            )}

          <footer className="mt-10 border-t border-white/10 py-5 text-[10px] leading-5 text-white/25">
            MELODIX ADMIN CONTROL CENTER · Admin actions
            are audited when permitted. Firestore Security
            Rules remain the source of truth for authorization.
          </footer>
        </div>
      </section>
    </main>
  );
}

// =========================================================
// OVERVIEW
// =========================================================

function Overview({
  data,
  counts,
  loading,
  onNavigate,
}: {
  data: Record<string, Row[]>;
  counts: {
    label: string;
    value: number;
    icon: typeof Music2;
  }[];
  loading: boolean;
  onNavigate: (section: Section) => void;
}) {
  const applications = data.bandApplications || [];
  const songs = data.songs || [];
  const bands = data.bands || [];

  const pendingSongs = songs.filter(
    (s) => s.status === "pending"
  ).length;

  const pendingApplications = applications.filter(
    (a) => a.status === "pending"
  ).length;

  const unpublishedBands = bands.filter(
    (b) => !b.isPublished
  ).length;

  return (
    <>
      <div className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-5">
        {counts.map((c) => {
          const Icon = c.icon;

          return (
            <article
              key={c.label}
              className="rounded-2xl border border-white/10 bg-white/[.025] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">
                  Total {c.label}
                </span>

                <Icon
                  size={17}
                  className="text-amber-300"
                />
              </div>

              <p className="mt-4 text-3xl font-black">
                {loading ? "—" : c.value}
              </p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 p-5">
          <h2 className="font-black">
            Perlu ditindaklanjuti
          </h2>

          {[
            {
              label: "Pengajuan band",
              value: pendingApplications,
              section: "applications" as Section,
            },
            {
              label: "Lagu menunggu review",
              value: pendingSongs,
              section: "songs" as Section,
            },
            {
              label: "Band belum tayang",
              value: unpublishedBands,
              section: "bands" as Section,
            },
          ].map((x) => (
            <button
              key={x.label}
              onClick={() => onNavigate(x.section)}
              className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/[.03] p-3 text-left hover:bg-white/[.06]"
            >
              <span className="text-sm text-white/60">
                {x.label}
              </span>

              <span className="flex items-center gap-3 font-black">
                {x.value}

                <ChevronRight
                  size={15}
                  className="text-amber-300"
                />
              </span>
            </button>
          ))}
        </article>

        <article className="rounded-2xl border border-white/10 p-5">
          <h2 className="font-black">Akses cepat</h2>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              {
                title: "Buat lagu untuk band",
                href: "/admin/music-studio",
                icon: FileMusic,
              },
              {
                title: "Review pengajuan",
                href: "/admin/band-applications",
                icon: BadgeCheck,
              },
              {
                title: "Band Studio",
                href: "/band-studio",
                icon: Users,
              },
              {
                title: "Lihat website",
                href: "/",
                icon: Activity,
              },
            ].map((x) => {
              const Icon = x.icon;

              return (
                <Link
                  key={x.href}
                  href={x.href}
                  className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm font-bold text-white/65 hover:border-amber-300/30 hover:text-amber-200"
                >
                  <Icon size={17} />
                  {x.title}

                  <ChevronRight
                    className="ml-auto"
                    size={14}
                  />
                </Link>
              );
            })}
          </div>
        </article>
      </div>
    </>
  );
}

// =========================================================
// RECORD LIST
// =========================================================

function Records({
  rows,
  collectionName,
  busy,
  onAction,
}: {
  rows: Row[];
  collectionName: string;
  busy: string;
  onAction: (
    col: string,
    row: Row,
    action: ActionType
  ) => Promise<void>;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-white/35">
        Tidak ada data pada koleksi ini.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => {
        const status = statusOf(row);
        const pending =
          busy === `${collectionName}/${row.id}`;

        const isUser = collectionName === "users";
        const isApp =
          collectionName === "bandApplications";
        const isSong = collectionName === "songs";
        const isBand = collectionName === "bands";
        const isAlbum = collectionName === "albums";
        const isAnnouncement =
          collectionName === "announcements";

        const canPublish =
          isSong || isBand || isAlbum || isAnnouncement;

        return (
          <article
            key={row.id}
            className="rounded-2xl border border-white/10 bg-white/[.02] p-4 sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="break-words font-black">
                    {titleOf(row)}
                  </h2>

                  <StatusBadge status={status} />
                </div>

                <p className="mt-1 break-all text-xs text-white/35">
                  {row.email ||
                    row.artist ||
                    row.slug ||
                    row.ownerEmail ||
                    row.id}
                </p>

                {row.ownerUid && (
                  <p className="mt-1 break-all font-mono text-[10px] text-white/20">
                    Owner: {row.ownerUid}
                  </p>
                )}

                {row.description && (
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-white/50">
                    {row.description}
                  </p>
                )}

                {row.lyricsWithChords && (
                  <pre className="mt-3 max-h-24 overflow-hidden whitespace-pre-wrap rounded-xl bg-black/40 p-3 font-mono text-xs text-white/40">
                    {row.lyricsWithChords}
                  </pre>
                )}

                {row.reviewNote && (
                  <p className="mt-2 text-xs text-sky-200">
                    Catatan: {row.reviewNote}
                  </p>
                )}

                {row.bandId && (
                  <p className="mt-2 text-[10px] text-white/30">
                    Band ID: {row.bandId}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 sm:max-w-[390px] sm:justify-end">
                {isApp && (
                  <>
                    <Action
                      disabled={pending}
                      good
                      onClick={() =>
                        onAction(
                          collectionName,
                          row,
                          "approve"
                        )
                      }
                    >
                      <Check size={13} />
                      Setujui
                    </Action>

                    <Action
                      disabled={pending}
                      danger
                      onClick={() =>
                        onAction(
                          collectionName,
                          row,
                          "reject"
                        )
                      }
                    >
                      <X size={13} />
                      Tolak
                    </Action>
                  </>
                )}

                {canPublish &&
                  (row.isPublished ? (
                    <Action
                      disabled={pending}
                      onClick={() =>
                        onAction(
                          collectionName,
                          row,
                          "draft"
                        )
                      }
                    >
                      Jadikan draft
                    </Action>
                  ) : (
                    <Action
                      disabled={pending}
                      good
                      onClick={() =>
                        onAction(
                          collectionName,
                          row,
                          "publish"
                        )
                      }
                    >
                      <Check size={13} />
                      Tayangkan
                    </Action>
                  ))}

                {isUser &&
                  (row.isSuspended ? (
                    <Action
                      disabled={pending}
                      good
                      onClick={() =>
                        onAction(
                          collectionName,
                          row,
                          "activate"
                        )
                      }
                    >
                      Aktifkan
                    </Action>
                  ) : (
                    <Action
                      disabled={pending}
                      danger
                      onClick={() =>
                        onAction(
                          collectionName,
                          row,
                          "suspend"
                        )
                      }
                    >
                      <Ban size={13} />
                      Suspend
                    </Action>
                  ))}

                {!isUser && !isApp && (
                  <Action
                    disabled={pending}
                    danger
                    onClick={() =>
                      onAction(
                        collectionName,
                        row,
                        "delete"
                      )
                    }
                  >
                    <Trash2 size={13} />
                    Hapus
                  </Action>
                )}

                {pending && (
                  <LoaderCircle
                    size={16}
                    className="animate-spin text-amber-300"
                  />
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// =========================================================
// NAV BUTTON
// =========================================================

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
        active
          ? "bg-amber-300 text-black"
          : "text-white/50 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      {label}

      {!!badge && badge > 0 && (
        <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({ status }: { status: string }) {
  const color = [
    "published",
    "approved",
    "active",
  ].includes(status)
    ? "bg-emerald-300/10 text-emerald-200"
    : ["rejected", "suspended"].includes(status)
    ? "bg-red-300/10 text-red-200"
    : "bg-amber-300/10 text-amber-200";

  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${color}`}
    >
      {status}
    </span>
  );
}

// =========================================================
// ACTION BUTTON
// =========================================================

function Action({
  children,
  onClick,
  disabled,
  good,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  good?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
        good
          ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
          : danger
          ? "border-red-300/20 bg-red-300/[.05] text-red-200"
          : "border-white/10 text-white/55 hover:border-amber-300/30 hover:text-amber-200"
      }`}
    >
      {children}
    </button>
  );
}

// =========================================================
// ALERT
// =========================================================

function Alert({
  children,
  type,
  onClose,
}: {
  children: ReactNode;
  type: "error" | "success";
  onClose?: () => void;
}) {
  const isError = type === "error";

  return (
    <div
      className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${
        isError
          ? "border-red-300/20 bg-red-300/[.06] text-red-100"
          : "border-emerald-300/20 bg-emerald-300/[.06] text-emerald-100"
      }`}
    >
      {isError ? (
        <CircleAlert
          size={16}
          className="mt-0.5 shrink-0"
        />
      ) : (
        <Check
          size={16}
          className="mt-0.5 shrink-0"
        />
      )}

      <span className="min-w-0 flex-1 break-words">
        {children}
      </span>

      {onClose && (
        <button onClick={onClose}>
          <X size={15} />
        </button>
      )}
    </div>
  );
}

// =========================================================
// SUCCESS MESSAGE
// =========================================================

function actionSuccessMessage(
  action: ActionType,
  title: string
) {
  const messages: Record<ActionType, string> = {
    publish: "Berhasil dipublikasikan",
    draft: "Berhasil dikembalikan ke draft",
    approve: "Pengajuan berhasil disetujui",
    reject: "Pengajuan berhasil ditolak",
    suspend: "Pengguna berhasil disuspend",
    activate: "Pengguna berhasil diaktifkan",
    delete: "Data berhasil dihapus",
  };

  return `${messages[action]}: ${title}`;
}
