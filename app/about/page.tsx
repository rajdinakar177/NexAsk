"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    IconBrandGithub,
    IconStar,
    IconGitFork,
    IconExternalLink,
    IconMapPin,
    IconMail,
    IconWorld,
    IconCode,
    IconBook,
    IconUsers,
    IconLoader2,
    IconAlertCircle,
} from "@tabler/icons-react";
import env from "@/app/env";
// ─── Profile Config ─────────────────────────────────────────────

const GITHUB_USERNAME = "rajdinakar177";

const PROFILE = {
    name: "Dinakar Raju",
    role: "Full Stack Developer",
    location: "Telanagana, India",
    email: env.EMAIL,

    links: {
        github: env.GITHUB_URL,
        linkedin: env.LINKEDIN_URL,
        // portfolio: "https://your-portfolio.com",
        // twitter: "https://twitter.com/your-handle",
        instagram: env.INSTAGRAM_URL,
    }
};

// ─── Types ─────────────────────────────────────────────────────

interface GitHubUser {
    login: string;
    name: string;
    avatar_url: string;
    bio: string;
    location: string;
    email: string;
    blog: string;
    public_repos: number;
    followers: number;
    following: number;
    html_url: string;
}

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    language: string;
    topics: string[];
    updated_at: string;
    fork: boolean;
}

// ─── Language colors ───────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Rust: "#dea584",
    Go: "#00ADD8",
    "C++": "#f34b7d",
    C: "#555555",
    Java: "#b07219",
    CSS: "#563d7c",
    HTML: "#e34c26",
};

function LanguageDot({ lang }: { lang: string }) {
    const color = LANG_COLORS[lang] ?? "#888";
    return (
        <span className="flex items-center gap-1 text-[11px] text-black/50 dark:text-white/40">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {lang}
        </span>
    );
}

function timeAgoShort(dateStr: string) {
    const d = new Date(dateStr);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

export default function AboutPage() {
    const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [repoFilter, setRepoFilter] = useState<"all" | "source">("source");
    const [langFilter, setLangFilter] = useState<string>("all");

    useEffect(() => {
        Promise.all([
            fetch(`/api/github?type=user`).then(r => r.json()),
            fetch(`/api/github?type=repos`).then(r => r.json()),
        ])
            .then(([user, repoList]) => {
                setGhUser(user);
                setRepos(Array.isArray(repoList) ? repoList : []);
            })
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    const filteredRepos = repos
        .filter(r => repoFilter === "all" || !r.fork)
        .filter(r => langFilter === "all" || r.language === langFilter)
        .sort((a, b) => b.stargazers_count - a.stargazers_count);

    const languages = Array.from(
        new Set(repos.filter(r => r.language).map(r => r.language))
    ).sort();

    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);

    return (
        <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">

            {/* ── HERO ── */}
            <div className="mb-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">

                {/* Avatar */}
                {ghUser?.avatar_url ? (
                    <img
                        src={ghUser.avatar_url}
                        className="h-24 w-24 rounded-2xl border object-cover shadow-lg"
                        alt="avatar"
                    />
                ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-orange-500 text-white text-2xl font-bold">
                        RD
                    </div>
                )}

                <div className="flex-1">
                    <h1 className="text-2xl font-bold">
                        {ghUser?.name ?? PROFILE.name}
                    </h1>

                    <a
                        href={PROFILE.links.github}
                        target="_blank"
                        className="text-sm text-orange-500 flex items-center gap-1"
                    >
                        <IconBrandGithub size={14} />
                        @{ghUser?.login ?? "rajdinakar177"}
                    </a>

                  

                    {/* Meta */}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">

                        <span className="flex items-center gap-1">
                            <IconMapPin size={12} />
                            {ghUser?.location ?? PROFILE.location}
                        </span>

                        <a href={`mailto:${PROFILE.email}`} className="flex items-center gap-1 hover:text-orange-500">
                            <IconMail size={12} />
                            Email
                        </a>

                       

                        <a href={PROFILE.links.linkedin} target="_blank" className="flex items-center gap-1 hover:text-orange-500">
                            LinkedIn
                        </a>

                    </div>

                    {/* Social buttons */}
                    <div className="mt-3 flex gap-2 flex-wrap">

                        <a href={PROFILE.links.github} className="border px-3 py-1 text-xs rounded-lg hover:text-orange-500">
                            GitHub
                        </a>

                        <a href={PROFILE.links.linkedin} className="border px-3 py-1 text-xs rounded-lg hover:text-orange-500">
                            LinkedIn
                        </a>

                       
                        <a href={PROFILE.links.instagram} className="border px-3 py-1 text-xs rounded-lg hover:text-orange-500">
                            Instagram
                        </a>

                    </div>
                </div>
            </div>

            {/* ── STATS ── */}
            {ghUser && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 text-center">

                    <div>Repos<br />{ghUser.public_repos}</div>
                    <div>Stars<br />{totalStars}</div>
                    <div>Followers<br />{ghUser.followers}</div>
                    <div>Following<br />{ghUser.following}</div>

                </div>
            )}

            {/* ── REPOS ── */}
            <div className="grid gap-3 sm:grid-cols-2">
                {filteredRepos.map(repo => (
                    <a
                        key={repo.id}
                        href={repo.html_url}
                        target="_blank"
                        className="border p-4 rounded-xl hover:border-orange-500"
                    >
                        <div className="font-semibold">{repo.name}</div>
                        <p className="text-xs text-black/60">{repo.description}</p>

                        <div className="mt-2 flex gap-2 text-xs">
                            {repo.language && <LanguageDot lang={repo.language} />}
                            ⭐ {repo.stargazers_count}
                            🍴 {repo.forks_count}
                        </div>
                    </a>
                ))}
            </div>

        </main>
    );
}