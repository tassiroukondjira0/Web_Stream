"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SessionUser {
  role: "USER" | "SUBSCRIBER" | "ADMIN" | "SUPER_ADMIN";
}

export function Footer() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <footer className="mt-auto border-t border-white/10 bg-black/60 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Catalogue</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/films" className="hover:text-white">Films en streaming</Link>
              </li>
              <li>
                <Link href="/series" className="hover:text-white">Séries & Documentaires</Link>
              </li>
              <li>
                <Link href="/nouveautes" className="hover:text-white">Dernières sorties</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Abonnement</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/premium" className="hover:text-white">Offre Premium</Link>
              </li>
              <li>
                <Link href="/aide" className="hover:text-white">Questions fréquentes</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Application</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href="/downloads/cinemax.apk"
                  download="CineMax.apk"
                  className="inline-flex items-center gap-1.5 hover:text-white"
                >
                  📱 Télécharger l&apos;APK Android
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Légal & Droits</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
              </li>
              <li>
                <Link href="/confidentialite" className="hover:text-white">Politique de confidentialité</Link>
              </li>
              <li>
                <Link href="/conditions" className="hover:text-white">Conditions d&apos;utilisation</Link>
              </li>
            </ul>
          </div>

          {!isAdmin && (
            <div className="md:col-span-2 lg:col-span-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Support</h3>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link
                    href="/aide"
                    onClick={() => {}}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-amber-300 hover:bg-zinc-700 hover:text-white transition-colors"
                  >
                    Aide — Assistant IA
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-zinc-500">
          <p>© 2026 CinéMax. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}

