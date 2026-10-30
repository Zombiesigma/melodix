import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
type MediaKind = "song-cover" | "album-cover" | "band-logo" | "band-cover";

function fail(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return fail("Autentikasi diperlukan.", 401);
    const decoded = await adminAuth().verifyIdToken(token, true);
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "") as MediaKind;
    const bandId = String(form.get("bandId") || "").trim();
    if (!(file instanceof File)) return fail("File gambar tidak ditemukan.");
    if (!(kind in { "song-cover": 1, "album-cover": 1, "band-logo": 1, "band-cover": 1 })) return fail("Jenis media tidak valid.");
    if (file.size < 1 || file.size > MAX_BYTES) return fail("Ukuran gambar maksimal 4 MB (batas aman upload serverless).");
    const ext = MIME_EXT[file.type];
    if (!ext) return fail("Format yang didukung: JPG, PNG, WEBP, AVIF.");

    const db = adminDb();
    const [adminSnap, userSnap] = await Promise.all([
      db.collection("admins").doc(decoded.uid).get(),
      db.collection("users").doc(decoded.uid).get(),
    ]);
    const isAdmin = adminSnap.exists && adminSnap.data()?.active === true;
    const userData = userSnap.data() || {};
    let ownsBand = false;
    if (bandId) {
      const bandSnap = await db.collection("bands").doc(bandId).get();
      ownsBand = bandSnap.exists && bandSnap.data()?.ownerUid === decoded.uid && bandSnap.data()?.verificationStatus === "approved";
    }
    if (!isAdmin && !ownsBand) return fail("Tidak memiliki izin mengunggah media untuk band ini.", 403);
    if ((kind === "band-logo" || kind === "band-cover") && !bandId) return fail("bandId wajib untuk gambar profil band.");
    if (userData.disabled === true) return fail("Akun dinonaktifkan.", 403);

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const githubToken = process.env.GITHUB_TOKEN;
    if (!owner || !repo || !githubToken) return fail("GitHub image storage belum dikonfigurasi di server.", 503);

    const folder: Record<MediaKind, string> = {
      "song-cover": "songs", "album-cover": "albums", "band-logo": "bands/logos", "band-cover": "bands/covers",
    };
    const safeBand = bandId ? `${bandId.replace(/[^a-zA-Z0-9_-]/g, "")}/` : "";
    const path = `public/uploads/${folder[kind]}/${safeBand}${Date.now()}-${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
    const isWebp = bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    const isAvif = bytes.length > 12 && bytes.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(bytes.toString("ascii", 8, 12));
    const validSignature = (file.type === "image/jpeg" && isJpeg) || (file.type === "image/png" && isPng) || (file.type === "image/webp" && isWebp) || (file.type === "image/avif" && isAvif);
    if (!validSignature) return fail("Isi file tidak sesuai dengan format gambar yang dipilih.");
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "Melodix-Media-Uploader",
      },
      body: JSON.stringify({ message: `Upload ${kind} for ${bandId || decoded.uid}`, content: bytes.toString("base64"), branch }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("GitHub upload failed", response.status, result?.message);
      return fail(response.status === 401 || response.status === 403 ? "GitHub menolak token atau izin repository." : "Gagal mengunggah gambar ke GitHub.", 502);
    }
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    return NextResponse.json({ success: true, url, path, sha: result.content?.sha, kind }, { status: 201 });
  } catch (error) {
    console.error("Media upload error", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan saat mengunggah gambar.";
    return fail(message.includes("Firebase Admin") ? message : "Autentikasi atau proses upload gagal.", message.includes("Firebase Admin") ? 503 : 401);
  }
}
