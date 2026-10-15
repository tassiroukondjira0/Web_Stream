import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageViewTracker } from "@/components/PageViewTracker";
import { getMetadataBase } from "@/lib/env";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CinéMax — Films & Séries en Streaming Légal",
    template: "%s | CinéMax",
  },
  description:
    "Découvrez un catalogue de films, séries d'animation et documentaires en streaming haute définition. Accès gratuit et contenus exclusifs réservés aux abonnés.",
  metadataBase: getMetadataBase(),
  openGraph: {
    title: "CinéMax — Streaming Vidéo Légal & HD",
    description: "Films, séries d'animation et créations originales en accès libre et premium sur CinéMax.",
    siteName: "CinéMax",
    locale: "fr_FR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#09090b",
};

/**
 * Coquille statique de l'en-tête. Avec Cache Components, `Navbar` (Client
 * Component) appelle `usePathname()` : sur les routes à paramètre dynamique non
 * pré-généré, cette valeur n'existe qu'à la requête et fait suspendre le
 * composant. Le `<Suspense>` de RootLayout affiche donc ce squelette pendant le
 * pré-rendu, puis la navbar réelle le remplace après hydratation. Hauteur et
 * fond identiques pour éviter tout décalage visuel.
 */
function NavbarFallback() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-white sm:text-xl"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-base font-black text-white shadow-lg shadow-violet-600/30 sm:h-9 sm:w-9">
            C
          </span>
          <span className="truncate bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            CinéMax
          </span>
        </Link>
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <Suspense fallback={<NavbarFallback />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
