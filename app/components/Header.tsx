"use client";

import Link from "next/link";
import { useAuthStore } from "@/app/store/Auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  IconFlame,
  IconSearch,
  IconUser,
  IconLogout,
  IconMenu2,
  IconX,
  IconPlus,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    const preferred = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, toggle };
}

export default function Header() {
  const { user, logout, verifySession } = useAuthStore();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Re-verify session on mount so reputation is fresh
  useEffect(() => {
    verifySession();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const reputation = user?.prefs?.reputation ?? 0;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl dark:bg-black/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-white">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500">
            <IconFlame size={16} className="text-white" />
          </div>
          <span className="hidden text-sm sm:block">
            Nex<span className="text-orange-500">Ask</span>
          </span>
        </Link>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="relative hidden flex-1 max-w-xl md:flex">
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions…"
            className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none transition focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-orange-500/40 hover:text-orange-400"
          >
            {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>

          {user ? (
            <>
              {/* Ask button */}
              <Link
                href="/questions/ask"
                className="hidden items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-400 sm:flex"
              >
                <IconPlus size={14} />
                Ask
              </Link>

              {/* Reputation badge */}
              <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 sm:flex">
                <IconFlame size={12} className="text-orange-400" />
                <span className="tabular-nums">{reputation}</span>
              </div>

              {/* Avatar → dashboard */}
              <Link
                href="/dashboard"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-orange-500/20 text-xs font-bold text-orange-400 transition hover:border-orange-500/50 hover:bg-orange-500/30"
                title="Dashboard"
              >
                {initials ?? <IconUser size={15} />}
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-red-500/50 hover:text-red-400"
                title="Logout"
              >
                <IconLogout size={15} />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-400"
              >
                Sign up
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <IconX size={16} /> : <IconMenu2 size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-black px-4 pb-4 pt-3 md:hidden">
          <form onSubmit={handleSearch} className="relative mb-3">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions…"
              className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/50"
            />
          </form>
          {user ? (
            <div className="flex flex-col gap-2">
              <Link
                href="/questions/ask"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
              >
                <IconPlus size={15} />
                Ask a Question
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60"
              >
                <IconUser size={15} />
                Dashboard · {reputation} rep
              </Link>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-lg border border-white/10 py-2 text-center text-sm text-white/70">
                Log in
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-lg bg-orange-500 py-2 text-center text-sm font-semibold text-white">
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}