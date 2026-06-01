"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Calendar,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Upload,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/library", label: "Library", icon: Search },
  { href: "/study-plan", label: "Study plan", icon: Calendar },
  { href: "/flashcards", label: "Flashcards", icon: RotateCcw },
  { href: "/exam", label: "Exam mode", icon: Target },
  { href: "/profile", label: "Profile", icon: User },
] as const;

type DashboardSidebarProps = {
  user: SupabaseUser;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
};

export default function DashboardSidebar({
  user,
  open,
  onClose,
  onSignOut,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const avatarInitial = (user.email ?? "A")[0].toUpperCase();

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-5 border-b border-subtle shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group"
          onClick={onClose}
        >
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shadow-glow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight group-hover:text-accent transition-colors">
            AcademiQ
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden ml-auto p-2 rounded-lg hover:bg-white/5 text-muted"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-accent-muted text-accent shadow-glow-sm border border-accent/20"
                  : "text-foreground-secondary hover:bg-elevated hover:text-foreground border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? "text-accent" : ""}`} />
              <span>{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-glow-sm" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-subtle space-y-1 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-elevated border border-subtle">
          <div className="w-8 h-8 rounded-full bg-accent-muted text-accent flex items-center justify-center text-xs font-bold shrink-0">
            {avatarInitial}
          </div>
          <p className="text-xs text-foreground-secondary truncate flex-1" title={user.email ?? ""}>
            {user.email}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-foreground-secondary hover:bg-elevated hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:sticky top-0 z-30 h-screen w-64 shrink-0 flex flex-col bg-card border-r border-subtle transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function DashboardMobileHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
  return (
    <header className="lg:hidden h-14 bg-card/80 backdrop-blur-xl border-b border-subtle flex items-center px-4 gap-3 shrink-0">
      <button
        type="button"
        onClick={onMenuOpen}
        className="p-2 rounded-xl hover:bg-elevated text-foreground-secondary"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-foreground">AcademiQ</span>
      </div>
    </header>
  );
}
