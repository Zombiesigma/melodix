import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getSongBySlug } from "@/lib/songs";
import SongViewer from "@/components/SongViewer";

export const dynamic = "force-dynamic";

type SongPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getRequestBaseUrl(): Promise<URL> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host") || "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata({
  params,
}: SongPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [song, metadataBase] = await Promise.all([
    getSongBySlug(slug),
    getRequestBaseUrl(),
  ]);

  if (!song) {
    return {
      title: "Lagu tidak ditemukan | Melodix",
      robots: { index: false, follow: false },
    };
  }

  const title = `${song.title} — ${song.artist || "Unknown artist"} | Melodix`;
  const description = `Baca chord dan lirik lagu ${song.title} dari ${song.artist || "Unknown artist"} di Melodix.`;
  const image = song.coverImageUrl || undefined;
  const canonicalPath = `/song/${encodeURIComponent(song.slug || song.id)}`;

  return {
    metadataBase,
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "website",
      url: canonicalPath,
      siteName: "Melodix",
      title: song.title,
      description: `${song.title} — ${song.artist || "Unknown artist"}. Chord dan lirik lagu di Melodix.`,
      ...(image
        ? {
            images: [
              {
                url: image,
                alt: `Cover ${song.title} — ${song.artist || "Unknown artist"}`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: song.title,
      description: `${song.title} — ${song.artist || "Unknown artist"}. Chord dan lirik lagu di Melodix.`,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function SongPage({ params }: SongPageProps) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);

  if (!song) {
    notFound();
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#050505] text-zinc-100">
      <SongViewer song={song} />
    </main>
  );
}
