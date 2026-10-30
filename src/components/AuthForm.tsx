"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Music2, LoaderCircle, Eye, EyeOff } from "lucide-react";

type Mode = "login" | "register";
type RoleChoice = "fan" | "band";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleChoice, setRoleChoice] = useState<RoleChoice>("fan");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";
  const redirectTo = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/band-studio";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        // Public registration can never grant privileged roles. Every new account starts as fan.
        await setDoc(doc(db, "users", credential.user.uid), {
          uid: credential.user.uid,
          email: credential.user.email,
          displayName: name.trim(),
          role: "fan",
          createdAt: serverTimestamp(),
        }, { merge: true });
        router.replace(roleChoice === "band" ? "/band-studio" : redirectTo);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        router.replace(redirectTo);
      }
    } catch (err: unknown) {
      const code = typeof err === "object" && err && "code" in err ? String((err as {code:string}).code) : "";
      const messages: Record<string,string> = {
        "auth/email-already-in-use": "Email ini sudah terdaftar. Coba masuk.",
        "auth/invalid-email": "Format email belum benar.",
        "auth/weak-password": "Password minimal 6 karakter.",
        "auth/invalid-credential": "Email atau password salah.",
        "auth/user-not-found": "Akun tidak ditemukan. Silakan daftar terlebih dahulu.",
        "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat.",
        "auth/network-request-failed": "Koneksi bermasalah. Periksa internet kamu.",
        "auth/operation-not-allowed": "Login Email/Password belum diaktifkan di Firebase Authentication.",
      };
      setError(messages[code] || "Belum berhasil. Periksa konfigurasi Firebase dan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-10 text-white flex items-center justify-center">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-white/55 hover:text-amber-300">
          <span aria-hidden>←</span> Kembali ke Melodix
        </Link>
        <div className="rounded-3xl border border-white/10 bg-[#111111] p-6 sm:p-8 shadow-2xl shadow-black/30">
          <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-black">
            <Music2 size={24} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">MELODIX COMMUNITY</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{isRegister ? "Bikin akun." : "Selamat datang lagi."}</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {isRegister ? "Gabung sebagai pendengar atau mulai perjalanan band kamu." : "Masuk untuk mengakses akun dan Band Studio kamu."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {isRegister && <>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-white/65">Nama kamu</span>
                <input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Nama atau nama band" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-300" />
              </label>
              <div>
                <span className="mb-2 block text-xs font-semibold text-white/65">Mau gabung sebagai apa?</span>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={()=>setRoleChoice("fan")} className={`rounded-xl border p-3 text-left ${roleChoice==="fan"?"border-amber-300 bg-amber-300/10":"border-white/10 bg-black/20"}`}>
                    <span className="block font-bold">Fan</span><span className="mt-1 block text-xs text-white/50">Baca & simpan lagu</span>
                  </button>
                  <button type="button" onClick={()=>setRoleChoice("band")} className={`rounded-xl border p-3 text-left ${roleChoice==="band"?"border-amber-300 bg-amber-300/10":"border-white/10 bg-black/20"}`}>
                    <span className="block font-bold">Band</span><span className="mt-1 block text-xs text-white/50">Ajukan verifikasi</span>
                  </button>
                </div>
                {roleChoice==="band" && <p className="mt-2 text-xs leading-5 text-amber-200/80">Pilihan Band akan membuka Band Studio untuk mengirim pengajuan. Akun tetap belum terverifikasi sampai disetujui admin.</p>}
              </div>
            </>}
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-white/65">Email</span>
              <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="kamu@email.com" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-amber-300" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-white/65">Password</span>
              <div className="flex rounded-xl border border-white/10 bg-black/30 focus-within:border-amber-300">
                <input required minLength={6} type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={isRegister?"new-password":"current-password"} placeholder="Minimal 6 karakter" className="min-w-0 flex-1 bg-transparent px-4 py-3 outline-none" />
                <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Sembunyikan password":"Tampilkan password"} className="px-4 text-white/50 hover:text-amber-300">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button>
              </div>
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3.5 font-extrabold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60">
              {busy && <LoaderCircle size={18} className="animate-spin" />}
              {busy ? "Tunggu sebentar..." : isRegister ? "Buat akun" : "Masuk"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-white/50">
            {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
            <Link className="font-bold text-amber-300 hover:text-amber-200" href={isRegister?"/login":"/register"}>{isRegister?"Masuk":"Daftar sekarang"}</Link>
          </p>
        </div>
        <p className="mt-5 text-center text-xs text-white/30">MELODIX — ruang musik, lirik, dan cerita band.</p>
      </div>
    </main>
  );
}
