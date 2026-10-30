import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });
    const decoded = await adminAuth().verifyIdToken(token, true);
    const admin = await adminDb().collection("admins").doc(decoded.uid).get();
    if (!admin.exists || admin.data()?.active !== true) return NextResponse.json({ error: "Hanya admin aktif yang dapat menghapus file repository." }, { status: 403 });
    const { path } = await request.json();
    if (typeof path !== "string" || !/^public\/uploads\/(songs|albums|bands\/(logos|covers))\/[a-zA-Z0-9_./-]+\.(jpg|png|webp|avif)$/.test(path) || path.includes("..")) {
      return NextResponse.json({ error: "Path media tidak valid." }, { status: 400 });
    }
    const owner = process.env.GITHUB_OWNER, repo = process.env.GITHUB_REPO, tokenValue = process.env.GITHUB_TOKEN, branch = process.env.GITHUB_BRANCH || "main";
    if (!owner || !repo || !tokenValue) return NextResponse.json({ error: "GitHub belum dikonfigurasi." }, { status: 503 });
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
    const headers = { Authorization: `Bearer ${tokenValue}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Melodix-Media-Uploader" };
    const get = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers, cache: "no-store" });
    if (!get.ok) return NextResponse.json({ error: "File tidak ditemukan di repository." }, { status: 404 });
    const data = await get.json();
    const del = await fetch(apiUrl, { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ message: "Remove unused Melodix media", sha: data.sha, branch }), cache: "no-store" });
    if (!del.ok) return NextResponse.json({ error: "GitHub gagal menghapus file." }, { status: 502 });
    return NextResponse.json({ success: true, path });
  } catch (error) {
    console.error("Media delete error", error);
    return NextResponse.json({ error: "Gagal menghapus media." }, { status: 500 });
  }
}
