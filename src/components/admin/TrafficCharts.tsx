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

interface ChartTooltipData {
  x: number;
  y: number;
  label: string;
  value: string;
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

function getTooltipPosition(bounds: DOMRect, clientX: number, clientY: number) {
  return {
    x: Math.max(12, Math.min(88, ((clientX - bounds.left) / bounds.width) * 100)),
    y: Math.max(28, Math.min(92, ((clientY - bounds.top) / bounds.height) * 100)),
  };
}

function ChartTooltip({ tooltip }: { tooltip: ChartTooltipData | null }) {
  if (!tooltip) return null;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 min-w-28 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-[#111522]/95 px-3 py-2 text-center shadow-xl backdrop-blur-xl"
      style={{ left: `${tooltip.x}%`, top: `calc(${tooltip.y}% - 10px)` }}
    >
      <span className="block text-[10px] text-zinc-400">{tooltip.label}</span>
      <span className="mt-0.5 block text-xs font-bold text-white">{tooltip.value}</span>
    </div>
  );
}

/** Histogramme SVG des pages vues mensuelles. */
function ViewsBarChart({ data }: { data: MonthPoint[] }) {
  const W = 640;
  const H = 200;
  const PAD = 28;
  const max = maxOf(data.map((d) => d.views));
  const stepX = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : W - PAD * 2;
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const barWidth = Math.min(28, stepX * 0.58);
  const [tooltip, setTooltip] = useState<ChartTooltipData | null>(null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full overflow-visible" role="img" aria-label="Pages vues par mois">
        <defs>
          <linearGradient id="trafficBars" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#7c3aed" />
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
        {data.map((d, i) => {
          const x = PAD + i * stepX;
          const barY = y(d.views);
          const value = `${d.views.toLocaleString("fr-FR")} pages vues`;
          const showAt = (clientX: number, clientY: number, bounds: DOMRect) => {
            setTooltip({ ...getTooltipPosition(bounds, clientX, clientY), label: d.label, value });
          };
          return (
            <g key={d.label}>
              <rect
                x={x - barWidth / 2}
                y={barY}
                width={barWidth}
                height={H - PAD - barY}
                rx="6"
                fill="url(#trafficBars)"
                opacity={d.views ? 1 : 0.25}
                className="cursor-crosshair transition-[filter] hover:brightness-125 focus:brightness-125"
                tabIndex={0}
                aria-label={`${d.label} : ${value}`}
                onMouseEnter={(event) => {
                  const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (bounds) showAt(event.clientX, event.clientY, bounds);
                }}
                onMouseMove={(event) => {
                  const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (bounds) showAt(event.clientX, event.clientY, bounds);
                }}
                onMouseLeave={() => setTooltip(null)}
                onFocus={(event) => {
                  const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (bounds) {
                    const rect = event.currentTarget.getBoundingClientRect();
                    showAt(rect.left + rect.width / 2, rect.top, bounds);
                  }
                }}
                onBlur={() => setTooltip(null)}
              />
              {i % 2 === 0 && (
                <text x={x} y={H - 8} textAnchor="middle" fontSize="9" fill="#a1a1aa">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}

/** Barres verticales (inscriptions mensuelles). */
function BarsChart({ data }: { data: SignupPoint[] }) {
  const max = maxOf(data.map((d) => d.signups));
  const [tooltip, setTooltip] = useState<ChartTooltipData | null>(null);
  return (
    <div className="relative">
      <div className="flex h-48 items-end gap-1.5">
        {data.map((d) => {
          const value = `${d.signups.toLocaleString("fr-FR")} inscription${d.signups > 1 ? "s" : ""}`;
          const showAt = (clientX: number, clientY: number, bounds: DOMRect) => {
            setTooltip({ ...getTooltipPosition(bounds, clientX, clientY), label: d.label, value });
          };
          return (
            <div
              key={d.label}
              className="flex min-w-0 flex-1 cursor-crosshair flex-col items-center gap-1.5 rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              tabIndex={0}
              aria-label={`${d.label} : ${value}`}
              onMouseEnter={(event) => {
                const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
                if (bounds) showAt(event.clientX, event.clientY, bounds);
              }}
              onMouseMove={(event) => {
                const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
                if (bounds) showAt(event.clientX, event.clientY, bounds);
              }}
              onMouseLeave={() => setTooltip(null)}
              onFocus={(event) => {
                const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
                if (bounds) {
                  const rect = event.currentTarget.getBoundingClientRect();
                  showAt(rect.left + rect.width / 2, rect.top, bounds);
                }
              }}
              onBlur={() => setTooltip(null)}
            >
              <span className="text-[10px] font-bold text-zinc-300">{d.signups > 0 ? d.signups : ""}</span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-sky-600 to-violet-400 transition-[filter] hover:brightness-125"
                style={{ height: `${Math.max(4, (d.signups / max) * 140)}px`, opacity: d.signups ? 1 : 0.25 }}
              />
              <span className="truncate text-[9px] text-zinc-500">{d.label.split(" ")[0]}</span>
            </div>
          );
        })}
      </div>
      <ChartTooltip tooltip={tooltip} />
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
  const [tooltip, setTooltip] = useState<ChartTooltipData | null>(null);
  const slices = data.slice(0, 2);

  return (
    <div className="relative flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0" role="img" aria-label="Répartition premium">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        {slices.map((slice, index) => {
          const sliceRatio = slice.value / total;
          const dashOffset = slices
            .slice(0, index)
            .reduce((sum, previous) => sum + (previous.value / total) * C, 0);
          const color = index === 0 ? "#f59e0b" : "#71717a";
          const showTooltip = () =>
            setTooltip({
              x: 50,
              y: 28,
              label: slice.label,
              value: `${slice.value.toLocaleString("fr-FR")} compte(s) — ${Math.round(sliceRatio * 100)} %`,
            });
          return (
            <circle
              key={slice.label}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={`${(sliceRatio * C).toFixed(1)} ${C.toFixed(1)}`}
              strokeDashoffset={`-${dashOffset.toFixed(1)}`}
              transform="rotate(-90 70 70)"
              className="cursor-pointer transition-[filter] hover:brightness-125 focus:brightness-125"
              tabIndex={0}
              aria-label={`${slice.label} : ${slice.value} comptes (${Math.round(sliceRatio * 100)} %)`}
              onMouseEnter={showTooltip}
              onFocus={showTooltip}
              onMouseLeave={() => setTooltip(null)}
              onBlur={() => setTooltip(null)}
            />
          );
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="20" fontWeight="800" fill="#fff">
          {total === 1 && premium === 0 && data.every((d) => d.value === 0) ? "0" : `${Math.round(pct * 100)}%`}
        </text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#a1a1aa">
          Premium
        </text>
      </svg>
      <ul className="space-y-2 text-xs">
        {slices.map((slice, index) => (
          <li key={slice.label} className="flex items-center gap-2 text-zinc-200">
            <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-amber-500" : "bg-zinc-600"}`} />
            {slice.label} — <strong className="text-white">{slice.value}</strong>
          </li>
        ))}
        <li className="pt-1 text-[11px] text-zinc-500">{total} compte(s) au total</li>
      </ul>
      <ChartTooltip tooltip={tooltip} />
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
      <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-6 text-center text-xs text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
        Chargement des statistiques de trafic…
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-6 text-center text-xs text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
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
          <div key={c.label} className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl transition-colors hover:border-white/[0.16]">
            <div className={`inline-flex rounded-lg p-2 ${c.tint}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-white">{c.value.toLocaleString("fr-FR")}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-zinc-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.065] to-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Eye className="h-4 w-4 text-violet-400" />
            Pages vues par mois — 12 derniers mois
          </h3>
          <div className="mt-4">
            <ViewsBarChart data={stats.viewsByMonth} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.065] to-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Crown className="h-4 w-4 text-amber-400" />
            Premium vs Standard
          </h3>
          <div className="mt-4">
            <DonutChart data={stats.premiumSplit} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.065] to-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
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
