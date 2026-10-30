import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Melodix — Lyrics, Chords & Band Community", template: "%s | Melodix" },
  description: "Temukan lirik, chord, dan karya band. Ruang musik untuk pendengar dan musisi independen.",
  applicationName: "Melodix",
  keywords: ["chord gitar", "lirik lagu", "band independen", "musik Indonesia"],
  openGraph: { type: "website", siteName: "Melodix", title: "Melodix — Lyrics, Chords & Band Community", description: "Temukan lirik, chord, dan karya band." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#09090b", colorScheme: "dark", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="id"><body>{children}</body></html>;
}
