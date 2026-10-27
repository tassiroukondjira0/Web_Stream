"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminNotifications } from "@/components/admin/AdminNotifications";

interface SessionUser {
  role: "USER" | "SUBSCRIBER" | "ADMIN" | "SUPER_ADMIN";
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted) setUser(data?.user ?? null);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.replace("/connexion");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-zinc-400">Chargementâ€¦</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-white mb-2">
        Centre de notifications
      </h1>
      <p className="text-zinc-400 mb-8">
        Envoyez une notification in-app Ã  tous vos utilisateurs ou aux
        abonnÃ©s Premium uniquement.
      </p>
      <AdminNotifications />
    </div>
  );
}

