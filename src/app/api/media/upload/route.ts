
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type MediaKind =
  | "song-cover"
  | "album-cover"
  | "band-logo"
  | "band-cover";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getStringField(data: any, name: string): string {
  return data?.fields?.[name]?.stringValue || "";
}

function getBooleanField(data: any, name: string): boolean {
  return data?.fields?.[name]?.booleanValue === true;
}

// Verifikasi Firebase ID Token melalui Firebase Authentication REST API.
async function verifyFirebaseToken(token: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("Firebase API Key belum dikonfigurasi di server.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      cache: "no-store",
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.users?.[0]?.localId) {
    throw new Error("Sesi login tidak valid atau sudah kedaluwarsa.");
  }

  const firebaseUser = result.users[0];

  if (firebaseUser.disabled === true) {
    throw new Error("Akun dinonaktifkan.");
  }

  return {
    uid: firebaseUser.localId as string,
    email: (firebaseUser.email || "") as string,
  };
}

// Membaca dokumen Firestore menggunakan ID Token pengguna.
// Permintaan ini tetap tunduk pada Firestore Security Rules.
async function getFirestoreDocument(
  collectionName: string,
  documentId: string,
  token: string
) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error("Firebase Project ID belum dikonfigurasi.");
  }

  const safeCollection = encodeURIComponent(collectionName);
  const safeDocumentId = encodeURIComponent(documentId);

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${safeCollection}/${safeDocumentId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        `Firestore menolak pembacaan ${collectionName}/${documentId}. Periksa Firestore Security Rules.`
      );
    }

    throw new Error("Gagal memeriksa data akun di Firestore.");
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    // 1. Ambil token login.
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return fail("Autentikasi diperlukan.", 401);
    }

    // 2. Verifikasi token langsung ke Firebase Authentication.
    const verifiedUser = await verifyFirebaseToken(token);
    const uid = verifiedUser.uid;

    // 3. Baca data upload.
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "") as MediaKind;
    const bandId = String(form.get("bandId") || "").trim();

    const validKinds: MediaKind[] = [
      "song-cover",
      "album-cover",
      "band-logo",
      "band-cover",
    ];

    if (!(file instanceof File)) {
      return fail("File gambar tidak ditemukan.");
    }

    if (!validKinds.includes(kind)) {
      return fail("Jenis media tidak valid.");
    }

    if (!bandId && (kind === "band-logo" || kind === "band-cover")) {
      return fail("bandId wajib untuk gambar profil band.");
    }

    if (file.size < 1 || file.size > MAX_BYTES) {
      return fail("Ukuran gambar maksimal 4 MB.");
    }

    const ext = MIME_EXT[file.type];

    if (!ext) {
      return fail("Format yang didukung: JPG, PNG, WEBP, AVIF.");
    }

    // 4. Periksa akun dan status admin.
    const [userDoc, adminDoc] = await Promise.all([
      getFirestoreDocument("users", uid, token),
      getFirestoreDocument("admins", uid, token),
    ]);

    const isAdmin =
      !!adminDoc && getBooleanField(adminDoc, "active");

    if (!userDoc && !isAdmin) {
      return fail("Data akun tidak ditemukan.", 403);
    }

    if (userDoc && getBooleanField(userDoc, "disabled")) {
      return fail("Akun dinonaktifkan.", 403);
    }

    // 5. Periksa kepemilikan band.
    let ownsBand = false;

    if (bandId) {
      const bandDoc = await getFirestoreDocument(
        "bands",
        bandId,
        token
      );

      ownsBand =
        !!bandDoc &&
        getStringField(bandDoc, "ownerUid") === uid &&
        getStringField(bandDoc, "verificationStatus") === "approved";
    }

    if (!isAdmin && !ownsBand) {
      return fail(
        "Tidak memiliki izin mengunggah media untuk band ini.",
        403
      );
    }

    // 6. Pastikan konfigurasi GitHub tersedia.
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const githubToken = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !githubToken) {
      return fail(
        "GitHub image storage belum dikonfigurasi di server.",
        503
      );
    }

    // 7. Validasi signature file, bukan hanya MIME type.
    const bytes = Buffer.from(await file.arrayBuffer());

    const isJpeg =
      bytes.length > 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff;

    const isPng =
      bytes.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );

    const isWebp =
      bytes.length > 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP";

    const isAvif =
      bytes.length > 12 &&
      bytes.toString("ascii", 4, 8) === "ftyp" &&
      ["avif", "avis"].includes(bytes.toString("ascii", 8, 12));

    const validSignature =
      (file.type === "image/jpeg" && isJpeg) ||
      (file.type === "image/png" && isPng) ||
      (file.type === "image/webp" && isWebp) ||
      (file.type === "image/avif" && isAvif);

    if (!validSignature) {
      return fail("Isi file tidak sesuai dengan format gambar.");
    }

    // 8. Tentukan folder penyimpanan.
    const folders: Record<MediaKind, string> = {
      "song-cover": "songs",
      "album-cover": "albums",
      "band-logo": "bands/logos",
      "band-cover": "bands/covers",
    };

    const safeBandId = bandId
      ? `${bandId.replace(/[^a-zA-Z0-9_-]/g, "")}/`
      : "";

    const path =
      `public/uploads/${folders[kind]}/${safeBandId}` +
      `${Date.now()}-${randomUUID()}.${ext}`;

    // 9. Upload ke GitHub Contents API.
    const githubUrl =
      `https://api.github.com/repos/` +
      `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/` +
      path.split("/").map(encodeURIComponent).join("/");

    const githubResponse = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "Melodix-Media-Uploader",
      },
      body: JSON.stringify({
        message: `Upload ${kind} for ${bandId || uid}`,
        content: bytes.toString("base64"),
        branch,
      }),
      cache: "no-store",
    });

    const githubResult = await githubResponse
      .json()
      .catch(() => ({}));

    if (!githubResponse.ok) {
      console.error(
        "GitHub upload failed:",
        githubResponse.status,
        githubResult?.message
      );

      return fail(
        githubResponse.status === 401 || githubResponse.status === 403
          ? "GitHub menolak token atau izin repository."
          : "Gagal mengunggah gambar ke GitHub.",
        502
      );
    }

    // 10. Kembalikan URL gambar.
    const url =
      `https://raw.githubusercontent.com/${owner}/${repo}/` +
      `${branch}/${path}`;

    return NextResponse.json(
      {
        success: true,
        url,
        path,
        sha: githubResult.content?.sha,
        kind,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Media upload error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengunggah gambar.";

    if (
      message.includes("Sesi login") ||
      message.includes("Autentikasi")
    ) {
      return fail(message, 401);
    }

    if (
      message.includes("Akun dinonaktifkan") ||
      message.includes("izin")
    ) {
      return fail(message, 403);
    }

    if (message.includes("belum dikonfigurasi")) {
      return fail(message, 503);
    }

    return fail(message, 500);
  }
}
