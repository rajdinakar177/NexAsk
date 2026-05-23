"use client";

import Link from "next/link";
import { useAuthStore } from "@/app/store/Auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconFlame,
  IconSearch,
  IconBell,
  IconUser,
  IconLogout,
  IconMenu2,
  IconX,
  IconPlus,
} from "@tabler/icons-react";

export default function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-white"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500">
            <IconFlame size={16} className="text-white" />
          </div>
          <span className="hidden text-sm sm:block">
            Nex<span className="text-orange-500">Ask</span>
          </span>
        </Link>

        {/* Search bar — desktop */}
        <form
          onSubmit={handleSearch}
          className="relative hidden flex-1 max-w-xl md:flex"
        >
          <IconSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions…"
            className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none transition focus:border-orange-500/50 focus:bg-white/8 focus:ring-1 focus:ring-orange-500/30"
          />

          {/* 🔥 Search Button */}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600 transition"
          >
            Search
          </button>
        </form>

        <div className="ml-auto flex items-center gap-2">
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
                <span>{Number(user?.prefs?.reputation || 0)}</span>              </div>

              {/* Avatar / profile */}
              <Link
                href="/dashboard"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:border-orange-500/50 hover:text-orange-400"
              >
                <IconUser size={15} />
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
            <IconSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions…"
              className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none focus:border-orange-500/50"
            />
          </form>
          {user && (
            <Link
              href="/questions/ask"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
            >
              <IconPlus size={15} />
              Ask a Question
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
