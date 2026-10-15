"use client";

import { useEffect, useState } from "react";
import { BarChart3, Users, Eye, Crown, UserRound, Library } from "lucide-react";

interface MonthPoint {
  label: string;
  views: number;
}

interface SignupPoint {
  label: string;
  signups: number;
}

interface SplitPoint {
  label: string;
  value: number;
}

interface AdminStats {
  totals: {
    totalUsers: number;
    premiumUsers: number;
    standardUsers: number;
    totalViews: number;
    monthViews: number;
    partnerTotal: number;
    partnerPublished: number;
  };
  viewsByMonth: MonthPoint[];
  signupsByMonth: SignupPoint[];
  premiumSplit: SplitPoint[];
}

function maxOf(values: number[]): number {
  return Math.max(1, ...values);
}

/** Courbe SVG lissée (visiteurs mensuels). */
function AreaChart({ data }: { data: MonthPoint[] }) {
  const W = 640;
  const H = 200;
  const PAD = 28;
  const max = maxOf(data.map((d) => d.views));
  const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const points = data.map((d, i) => ({ x: PAD + i * stepX, y: y(d.views) }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${(PAD + (data.length - 1) * stepX).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" role="img" aria-label="Visiteurs mensuels">
      <defs>
        <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD}
          x2={W - 8}
          y1={H - PAD - f * (H - PAD * 2)}
          y2={H - PAD - f * (H - PAD * 2)}
          stroke="rgba(255,255,255,0.07)"
          strokeDasharray="3 4"
        />
      ))}
      <path d={area} fill="url(#trafficFill)" />
      <path d={line} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#ef4444" stroke="#09090b" strokeWidth="1.5" />
          {i % 2 === 0 && (
            <text x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="#71717a">
              {data[i].label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Barres verticales (inscriptions mensuelles). */
function BarsChart({ data }: { data: SignupPoint[] }) {
  const max = maxOf(data.map((d) => d.signups));
  return (
    <div className="flex h-48 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${d.label} : ${d.signups}`}>
          <span className="text-[10px] font-bold text-zinc-300">{d.signups > 0 ? d.signups : ""}</span>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-sky-600 to-sky-400"
            style={{ height: `${Math.max(4, (d.signups / max) * 140)}px`, opacity: d.signups ? 1 : 0.25 }}
          />
          <span className="truncate text-[9px] text-zinc-500">{d.label.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}

/** Anneau de répartition Premium / Standard. */
function DonutChart({ data }: { data: SplitPoint[] }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const premium = data[0]?.value ?? 0;
  const ratio = premium / total;
  const R = 54;
  const C = 2 * Math.PI * R;
  const pct = total === 1 && premium === 0 ? 0 : ratio;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0" role="img" aria-label="Répartition premium">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        <circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(pct * C).toFixed(1)} ${C.toFixed(1)}`}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">
          {total === 1 && premium === 0 && data.every((d) => d.value === 0) ? "0" : `${Math.round(pct * 100)}%`}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#a1a1aa">
          Premium
        </text>
      </svg>
      <ul className="space-y-2 text-xs">
        <li className="flex items-center gap-2 text-zinc-200">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Premium — <strong className="text-white">{data[0]?.value ?? 0}</strong>
        </li>
        <li className="flex items-center gap-2 text-zinc-200">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          Standard — <strong className="text-white">{data[1]?.value ?? 0}</strong>
        </li>
        <li className="pt-1 text-[11px] text-zinc-500">{total} compte(s) au total</li>
      </ul>
    </div>
  );
}

export function TrafficCharts() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data?.success) setStats(data);
        else setError(true);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-center text-xs text-zinc-500">
        Chargement des statistiques de trafic…
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-center text-xs text-zinc-500">
        Statistiques indisponibles (base de données requise).
      </div>
    );
  }

  const cards = [
    { icon: Eye, label: "Pages vues (mois en cours)", value: stats.totals.monthViews, tint: "text-violet-400 bg-violet-500/10" },
    { icon: BarChart3, label: "Pages vues (total)", value: stats.totals.totalViews, tint: "text-sky-400 bg-sky-500/10" },
    { icon: Crown, label: "Utilisateurs Premium", value: stats.totals.premiumUsers, tint: "text-amber-400 bg-amber-500/10" },
    { icon: UserRound, label: "Utilisateurs Standard", value: stats.totals.standardUsers, tint: "text-zinc-300 bg-zinc-500/10" },
    { icon: Users, label: "Comptes (total)", value: stats.totals.totalUsers, tint: "text-emerald-400 bg-emerald-500/10" },
    { icon: Library, label: "Titres partenaires (publiés)", value: stats.totals.partnerPublished, tint: "text-violet-400 bg-violet-500/10" },
  ];

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
            <div className={`inline-flex rounded-lg p-2 ${c.tint}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">{c.value.toLocaleString("fr-FR")}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-zinc-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Eye className="h-4 w-4 text-violet-400" />
            Visiteurs mensuels — pages vues (12 derniers mois)
          </h3>
          <div className="mt-4">
            <AreaChart data={stats.viewsByMonth} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Crown className="h-4 w-4 text-amber-400" />
            Premium vs Standard
          </h3>
          <div className="mt-4">
            <DonutChart data={stats.premiumSplit} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Users className="h-4 w-4 text-sky-400" />
          Nouveaux comptes par mois (12 derniers mois)
        </h3>
        <div className="mt-4">
          <BarsChart data={stats.signupsByMonth} />
        </div>
      </div>
    </section>
  );
}
