"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/app/store/Auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    IconArrowUp,
    IconMessageCircle,
    IconQuestionMark,
    IconEdit,
    IconLogout,
    IconClock,
    IconTag,
    IconTrophy,
    IconFlame,
} from "@tabler/icons-react";
import { timeAgo } from "@/app/components/QuestionCard";

interface Question {
    $id: string;
    $createdAt: string;
    title: string;
    tags: string[];
    totalAnswers: number;
    totalVotes: number;
}

interface Answer {
    $id: string;
    $createdAt: string;
    content: string;
    questionId: string;
    questionTitle: string;
    totalVotes: number;
}

interface Vote {
    $id: string;
    $createdAt: string;
    type: string;
    typeId: string;
    voteStatus: string;
    targetTitle: string;
}

interface DashboardData {
    questions: Question[];
    answers: Answer[];
    votes: Vote[];
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ElementType;
    label: string;
    value: number | string;
    color: string;
}) {
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/40">{label}</p>
            </div>
        </div>
    );
}

function Section({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025]">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
                <Icon size={14} className="text-orange-400" />
                <h2 className="text-sm font-semibold text-white/70">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function DashboardPage() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"questions" | "answers" | "votes">("questions");

    useEffect(() => {
        if (!user) {
            router.push("/login");
            return;
        }
        fetch(`/api/dashboard?userId=${user.$id}`)
            .then((r) => r.json())
            .then(setData)
            .catch(() => setData({ questions: [], answers: [], votes: [] }))
            .finally(() => setLoading(false));
    }, [user]);

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };
    console.log("reputation",user)
    if (!user) return null;

    const reputation = user.prefs?.reputation ?? 0;

    const initials = user.name
        ? user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
        : "?";

    const reputationLevel =
        reputation >= 1000
            ? { label: "Expert", color: "text-yellow-400", bg: "bg-yellow-400/10" }
            : reputation >= 500
            ? { label: "Advanced", color: "text-purple-400", bg: "bg-purple-400/10" }
            : reputation >= 100
            ? { label: "Contributor", color: "text-blue-400", bg: "bg-blue-400/10" }
            : reputation >= 10
            ? { label: "Member", color: "text-emerald-400", bg: "bg-emerald-400/10" }
            : { label: "Newcomer", color: "text-white/40", bg: "bg-white/5" };

    const tabs = ["questions", "answers", "votes"] as const;
    const tabCount = (tab: typeof tabs[number]) =>
        data ? (tab === "questions" ? data.questions.length : tab === "answers" ? data.answers.length : data.votes.length) : 0;

    return (
        <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-xl font-bold text-white shadow-[0_0_24px_rgba(249,115,22,0.3)]">
                        {initials}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">{user.name}</h1>
                        <p className="mt-0.5 text-sm text-white/40">{user.email}</p>
                        <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${reputationLevel.bg} ${reputationLevel.color}`}>
                            <IconTrophy size={10} />
                            {reputationLevel.label}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/questions/ask"
                        className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
                    >
                        <IconEdit size={14} />
                        Ask Question
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/50 transition hover:border-red-500/30 hover:text-red-400"
                    >
                        <IconLogout size={14} />
                        Logout
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={IconFlame} label="Reputation" value={reputation} color="bg-orange-500/15 text-orange-400" />
                <StatCard icon={IconQuestionMark} label="Questions" value={data?.questions.length ?? "—"} color="bg-blue-500/15 text-blue-400" />
                <StatCard icon={IconMessageCircle} label="Answers" value={data?.answers.length ?? "—"} color="bg-emerald-500/15 text-emerald-400" />
                <StatCard icon={IconArrowUp} label="Votes Cast" value={data?.votes.length ?? "—"} color="bg-purple-500/15 text-purple-400" />
            </div>

            {/* Tabs */}
            <div className="mb-5 flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.025] p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 rounded-lg py-2 text-xs font-medium capitalize transition ${
                            activeTab === tab ? "bg-orange-500 text-white" : "text-white/40 hover:text-white/70"
                        }`}
                    >
                        {tab}
                        {data && (
                            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab ? "bg-white/20" : "bg-white/5"}`}>
                                {tabCount(tab)}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.02]" />
                    ))}
                </div>
            ) : (
                <>
                    {activeTab === "questions" && (
                        <Section title="Your Questions" icon={IconQuestionMark}>
                            {!data?.questions.length ? (
                                <div className="py-8 text-center">
                                    <p className="text-sm text-white/30">You have not asked any questions yet.</p>
                                    <Link href="/questions/ask" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-400">
                                        Ask your first question
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {data.questions.map((q) => (
                                        <Link
                                            key={q.$id}
                                            href={`/questions/${q.$id}`}
                                            className="group flex items-start justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 transition hover:border-orange-500/20 hover:bg-white/[0.04]"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-white/80 transition group-hover:text-white">
                                                    {q.title}
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                    {q.tags.slice(0, 3).map((tag) => (
                                                        <span key={tag} className="inline-flex items-center gap-0.5 rounded-md border border-white/8 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/35">
                                                            <IconTag size={8} />
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    <span className="text-[10px] text-white/20">
                                                        <IconClock size={9} className="mr-0.5 inline" />
                                                        {timeAgo(q.$createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-3 text-[11px]">
                                                <span className={`flex items-center gap-1 ${q.totalVotes > 0 ? "text-orange-400" : "text-white/25"}`}>
                                                    <IconArrowUp size={12} />
                                                    {q.totalVotes}
                                                </span>
                                                <span className={`flex items-center gap-1 ${q.totalAnswers > 0 ? "text-emerald-400" : "text-white/25"}`}>
                                                    <IconMessageCircle size={12} />
                                                    {q.totalAnswers}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </Section>
                    )}

                    {activeTab === "answers" && (
                        <Section title="Your Answers" icon={IconMessageCircle}>
                            {!data?.answers.length ? (
                                <div className="py-8 text-center">
                                    <p className="text-sm text-white/30">You have not answered any questions yet.</p>
                                    <Link href="/" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-400">
                                        Browse questions
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {data.answers.map((a) => (
                                        <Link
                                            key={a.$id}
                                            href={`/questions/${a.questionId}`}
                                            className="group block rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5 transition hover:border-orange-500/20 hover:bg-white/[0.04]"
                                        >
                                            <p className="mb-1.5 text-xs font-medium text-white/40 transition group-hover:text-orange-400/70">
                                                Re: {a.questionTitle}
                                            </p>
                                            <p className="line-clamp-2 text-sm text-white/70">
                                                {a.content.replace(/[#*`_~>]/g, "").trim()}
                                            </p>
                                            <div className="mt-2 flex items-center gap-3 text-[11px] text-white/25">
                                                <span className={`flex items-center gap-1 ${a.totalVotes > 0 ? "text-orange-400" : ""}`}>
                                                    <IconArrowUp size={10} />
                                                    {a.totalVotes} votes
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <IconClock size={10} />
                                                    {timeAgo(a.$createdAt)}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </Section>
                    )}

                    {activeTab === "votes" && (
                        <Section title="Your Votes" icon={IconArrowUp}>
                            {!data?.votes.length ? (
                                <div className="py-8 text-center">
                                    <p className="text-sm text-white/30">You have not voted on anything yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {data.votes.map((v) => (
                                        <Link
                                            key={v.$id}
                                            href={`/questions/${v.typeId}`}
                                            className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 transition hover:border-orange-500/20 hover:bg-white/[0.04]"
                                        >
                                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                                v.voteStatus === "upvoted"
                                                    ? "bg-orange-500/15 text-orange-400"
                                                    : "bg-red-500/15 text-red-400"
                                            }`}>
                                                <IconArrowUp size={13} className={v.voteStatus === "downvoted" ? "rotate-180" : ""} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm text-white/70 transition group-hover:text-white">
                                                    {v.targetTitle || `${v.type} vote`}
                                                </p>
                                                <p className="text-[10px] text-white/25">
                                                    {v.voteStatus === "upvoted" ? "Upvoted" : "Downvoted"} · {v.type} · {timeAgo(v.$createdAt)}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </Section>
                    )}
                </>
            )}
        </main>
    );
}