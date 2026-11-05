"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, Mail, Headphones, Users, ArrowUpRight } from "lucide-react";

interface SessionUser {
  role: "USER" | "SUBSCRIBER" | "ADMIN" | "SUPER_ADMIN";
}

export function Footer() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [apkUrl, setApkUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));

    // Récupérer dynamiquement le dernier lien APK depuis l'API
    fetch("/api/build-info", { cache: "no-store" })
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.artifactUrl) setApkUrl(data.artifactUrl);
        else if (data?.buildUrl) setApkUrl(data.buildUrl);
      })
      .catch(() => {});
  }, []);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <footer className="mt-auto border-t border-white/10 bg-background(#0b1120) ">
      {/* Hero section du footer — style streamix */}
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Hero text */}
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Votre espace cinéma
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Vos histoires.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">
                Votre univers.
              </span>
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Des histoires qui méritent de veiller tard.
            </p>
          </div>

          {/* Carte App */}
          {apkUrl && (
            <div>
              <a
                href={apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-zinc-300 transition-colors group-hover:text-white">
                  <Smartphone className="h-6 w-6" />
                </span>
                <span className="flex-1">
                  <strong className="block text-sm font-semibold text-white">
                    Découvrir l&apos;application
                  </strong>
                  <small className="text-xs text-zinc-400">
                    L&apos;expérience CinéMax sur votre appareil.
                  </small>
                </span>
                <ArrowUpRight className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-white" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Navigation et identité */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Identité */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-white">
              CinéMax
            </Link>
            <p className="mt-2 text-xs text-zinc-500">
              Un univers d&apos;histoires à découvrir.
            </p>
          </div>

          {/* Explorer */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Explorer</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/films" className="hover:text-white">Films en streaming</Link>
              </li>
              <li>
                <Link href="/series" className="hover:text-white">Séries & Documentaires</Link>
              </li>
              <li>
                <Link href="/animes" className="hover:text-white">Animes</Link>
              </li>
              <li>
                <Link href="/nouveautes" className="hover:text-white">Dernières sorties</Link>
              </li>
            </ul>
          </div>

          {/* Assistance */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Assistance</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/premium" className="hover:text-white">Offre Premium</Link>
              </li>
              <li>
                <Link href="/aide" className="hover:text-white">Questions fréquentes</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">Nous contacter</Link>
              </li>
            </ul>
          </div>

          {/* Informations */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-200">Informations</h3>
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
              <li>
                <Link href="/aide" className="hover:text-white">Assistant IA</Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">Support & Contact</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Action cards — style streamix */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!isAdmin && (
            <Link
              href="/aide"
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-zinc-400 transition-colors group-hover:text-white">
                <Headphones className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <strong className="block text-sm font-semibold text-white">Centre de support</strong>
                <small className="text-xs text-zinc-400">Une difficulté ? Notre équipe est là.</small>
              </span>
              <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-white" />
            </Link>
          )}

          <Link
            href="/contact"
            className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-zinc-400 transition-colors group-hover:text-white">
              <Mail className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <strong className="block text-sm font-semibold text-white">Nous contacter</strong>
              <small className="text-xs text-zinc-400">Questions et propositions.</small>
            </span>
            <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-white" />
          </Link>

          <Link
            href="/premium"
            className="group flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/10"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-zinc-400 transition-colors group-hover:text-white">
              <Users className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <strong className="block text-sm font-semibold text-white">Rejoindre l&apos;aventure</strong>
              <small className="text-xs text-zinc-400">Découvrez l&apos;offre Premium.</small>
            </span>
            <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-white" />
          </Link>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <span>© 2026 CinéMax</span>
          <span>Tous droits réservés.</span>
        </div>
      </div>
    </footer>
  );
}

