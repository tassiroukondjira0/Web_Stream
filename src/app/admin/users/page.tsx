"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Users, ArrowLeft } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "SUBSCRIBER" | "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erreur");
        if (active) setUsers(data.users);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const changeRole = async (userId: string, role: string) => {
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Erreur");
        return;
      }
      window.location.reload();
    } catch {
      alert("Erreur réseau");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin" className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-400" />
          Gestion des utilisateurs
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 text-zinc-300">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rôle</th>
                <th className="px-4 py-3 text-left">Inscrit le</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white">{u.name || "—"}</td>
                  <td className="px-4 py-3 text-zinc-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                      u.role === "SUPER_ADMIN" ? "bg-purple-500/20 text-purple-300" :
                      u.role === "ADMIN" ? "bg-amber-500/20 text-amber-300" :
                      u.role === "SUBSCRIBER" ? "bg-emerald-500/20 text-emerald-300" :
                      "bg-zinc-700 text-zinc-300"
                    }`}>
                      {u.role === "SUPER_ADMIN" && <ShieldCheck className="h-3 w-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== "SUPER_ADMIN" && (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        className="rounded-lg border border-white/10 bg-zinc-800 px-2 py-1 text-xs text-white"
                      >
                        <option value="USER">USER</option>
                        <option value="SUBSCRIBER">SUBSCRIBER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}