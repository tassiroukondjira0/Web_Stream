"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, ChevronDown, LogOut, Heart, ListPlus, ShieldCheck, Bell, LogIn, UserPlus, Users } from "lucide-react";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "SUBSCRIBER" | "ADMIN" | "SUPER_ADMIN";
}

export function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const isAuthenticated = Boolean(user);

  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-4">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700 hover:text-white sm:px-3"
        >
          {isAuthenticated ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-amber-600 text-xs font-bold text-white">
              {user!.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{isAuthenticated ? user!.name : "Mon Compte"}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 max-h-[70vh] w-60 max-w-[78vw] overflow-y-auto overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
          >
            {isAuthenticated ? (
              <>
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-white">{user!.name}</p>
                  <p className="truncate text-xs text-zinc-400">{user!.email}</p>
                  {(user!.role === "ADMIN" || user!.role === "SUPER_ADMIN") && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                      <ShieldCheck className="h-3 w-3" />
                      ADMIN
                    </span>
                  )}
                </div>

                <div className="py-1.5">
                  <Link
                    href="/mon-compte"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <User className="h-4 w-4 text-zinc-400" />
                    Mon profil
                  </Link>
                  {(user!.role === "ADMIN" || user!.role === "SUPER_ADMIN") && (
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <ShieldCheck className="h-4 w-4 text-purple-400" />
                      Dashboard admin
                    </Link>
                  )}
                  {(user!.role === "ADMIN" || user!.role === "SUPER_ADMIN") && (
                    <>
                      <Link
                        href="/admin/notifications"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <Bell className="h-4 w-4 text-purple-400" />
                        Centre de notifications
                      </Link>
                      {user!.role === "SUPER_ADMIN" && (
                        <Link
                          href="/admin/users"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <Users className="h-4 w-4 text-purple-400" />
                          Gestion des utilisateurs
                        </Link>
                      )}
                    </>
                  )}
                  <Link
                    href="/favoris"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Heart className="h-4 w-4 text-violet-400" />
                    Mes favoris
                  </Link>
                  <Link
                    href="/souhaits"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <ListPlus className="h-4 w-4 text-amber-400" />
                    Ma liste de souhaits
                  </Link>
                  <Link
                    href="/premium"
                    onClick={() => setOpen(false)}
                    className="mx-2 mt-1 flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/10 px-3 py-2.5 text-sm font-semibold text-amber-300 transition-colors hover:from-amber-500/25 hover:to-amber-600/20 hover:text-amber-200"
                  >
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    Pass Premium
                  </Link>
                </div>

                <div className="border-t border-white/10 py-1.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-violet-500/10 hover:text-violet-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </button>
                </div>
              </>
            ) : (
              <div className="py-1.5">
                <Link
                  href="/connexion"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <LogIn className="h-4 w-4 text-zinc-400" />
                  Se connecter
                </Link>
                <Link
                  href="/inscription"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <UserPlus className="h-4 w-4 text-zinc-400" />
                  S&apos;inscrire
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



