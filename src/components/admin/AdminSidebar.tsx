"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Film,
  Users,
  Settings,
  Bell,
  Star,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";
import Image from "next/image";

type TabKey =
  | "overview"
  | "medias"
  | "partners"
  | "sync"
  | "users"
  | "reviews"
  | "notifications"
  | "settings";

interface AdminSidebarProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  isSuperAdmin: boolean;
}

const navItems = (isSuperAdmin: boolean) => [
  { key: "overview" as const, label: "Vue d'ensemble", icon: LayoutDashboard },
  { key: "medias" as const, label: "Catalogue", icon: Film },
  ...(isSuperAdmin
    ? [
        { key: "partners" as const, label: "Partenaires", icon: Database },
        { key: "sync" as const, label: "Synchronisation", icon: Database },
      ]
    : []),
  { key: "users" as const, label: "Utilisateurs", icon: Users, link: "/admin/users" },
  { key: "reviews" as const, label: "Avis", icon: Star, link: "/admin/reviews" },
  { key: "notifications" as const, label: "Notifications", icon: Bell, link: "/admin/notifications" },
  { key: "settings" as const, label: "Paramètres", icon: Settings },
];

export function AdminSidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  isSuperAdmin,
}: AdminSidebarProps) {
  const items = navItems(isSuperAdmin);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] bg-[#0f1629] transition-all duration-300 lg:z-30 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "w-[72px]" : "w-[260px]"}`}
      >
        {/* Logo / header */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <Image src="/logo.svg" alt="CinéMax" width={32} height={32} className="h-8 w-8" />
              <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
                Admin
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="flex items-center justify-center">
              <Image src="/logo.svg" alt="CinéMax" width={28} height={28} className="h-7 w-7" />
            </Link>
          )}
          {/* Mobile close */}
          <button
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {/* Desktop collapse */}
          <button
            className="hidden rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white lg:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (item.link) {
                    window.location.href = item.link;
                  } else {
                    setActiveTab(item.key);
                    setMobileOpen(false);
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600/20 to-purple-600/10 text-violet-300 shadow-inner"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-violet-400" : ""}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] p-4">
          <Link
            href="/"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-zinc-200 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Retour au site</span>}
          </Link>
        </div>
      </aside>
    </>
  );
}

/* Mobile hamburger — placed in the top bar */
export function MobileHamburger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}

export type { TabKey };
