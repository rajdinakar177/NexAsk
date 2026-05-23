"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "@/app/store/Auth";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
    IconMessageCircle,
    IconSend,
    IconLoader2,
    IconUser,
    IconClock,
    IconAlertCircle,
    IconTrash,
    IconCheck,
} from "@tabler/icons-react";
import VoteButtons from "@/app/components/VoteButtons";
import { timeAgo } from "@/app/components/QuestionCard";

const RTE = dynamic(() => import("@/app/components/RTE"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
    $id: string;
    $createdAt: string;
    content: string;
    authorId: string;
    authorName: string;
}

interface Answer {
    $id: string;
    $createdAt: string;
    content: string;
    authorId: string;
    authorName: string;
    authorReputation: number;
    upvotes: number;
    downvotes: number;
    comments: Comment[];
    userVote?: "upvoted" | "downvoted" | null;  // ← added
}

interface PlainQuestion {
    $id: string;
    $createdAt: string;
    title: string;
    content: string;
    authorId: string;
    tags: string[];
    attachmentId?: string;
}

interface Props {
    questionId: string;
    question: PlainQuestion;
    initialAnswers: Answer[];
    initialQuestionComments: Comment[];
    questionUpvotes: number;    // ← added
    questionDownvotes: number;  // ← added
}

// ─── Tiny markdown renderer (client-safe) ─────────────────────────────────────
function renderMd(md: string) {
    return md
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
            `<pre class="code-block" data-lang="${lang}"><code>${code.trim()}</code></pre>`)
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
        .replace(/^> (.+)$/gm, '<blockquote class="md-bq">$1</blockquote>')
        .replace(/^[-*] (.+)$/gm, '<li class="md-li">$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li class="md-li md-oli">$1</li>')
        .replace(/^---$/gm, '<hr class="md-hr"/>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img"/>')
        .replace(/^(?!<[a-zA-Z/]|$)(.+)$/gm, "<p>$1</p>");
}

// ─── Comment list + add comment ───────────────────────────────────────────────

function CommentThread({
    comments: initialComments,
    type,
    typeId,
}: {
    comments: Comment[];
    type: "question" | "answer";
    typeId: string;
}) {
    const { user } = useAuthStore();
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [posting, setPosting] = useState(false);
    const [err, setErr] = useState("");

    const submit = async () => {
        if (!input.trim() || input.trim().length < 5) {
            setErr("Comment must be at least 5 characters.");
            return;
        }
        if (!user) return;
        setPosting(true);
        setErr("");
        try {
            const res = await fetch("/api/comment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: input.trim(),
                    type,
                    typeId,
                    authorId: user.$id,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Failed to post comment");
            }
            const c = await res.json();
            setComments((prev) => [
                ...prev,
                {
                    $id: c.$id,
                    $createdAt: c.$createdAt,
                    content: c.content,
                    authorId: c.authorId,
                    authorName: user.name ?? user.$id.slice(0, 8),
                },
            ]);
            setInput("");
            setOpen(false);
        } catch (e: any) {
            setErr(e.message);
        } finally {
            setPosting(false);
        }
    };

    const deleteComment = async (commentId: string) => {
        if (!user) return;
        try {
            await fetch("/api/comment", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentId, authorId: user.$id }),
            });
            setComments((prev) => prev.filter((c) => c.$id !== commentId));
        } catch { }
    };

    return (
        <div className="mt-3 border-t border-white/[0.05] pt-3">
            {comments.map((c) => (
                <div key={c.$id} className="group mb-2 flex items-start gap-2 text-[11px] text-white/40">
                    <span className="shrink-0 font-medium text-white/55">{c.authorName}</span>
                    <span className="flex-1 leading-relaxed">{c.content}</span>
                    <span className="shrink-0 text-white/20">{timeAgo(c.$createdAt)}</span>
                    {user?.$id === c.authorId && (
                        <button
                            onClick={() => deleteComment(c.$id)}
                            className="shrink-0 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                        >
                            <IconTrash size={11} />
                        </button>
                    )}
                </div>
            ))}

            {user ? (
                open ? (
                    <div className="mt-2 space-y-1.5">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Add a comment…"
                            rows={2}
                            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none transition focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20"
                        />
                        {err && <p className="text-[11px] text-red-400">{err}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={submit}
                                disabled={posting}
                                className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
                            >
                                {posting ? <IconLoader2 size={11} className="animate-spin" /> : <IconSend size={11} />}
                                Post
                            </button>
                            <button
                                onClick={() => { setOpen(false); setInput(""); setErr(""); }}
                                className="text-[11px] text-white/30 transition hover:text-white/60"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setOpen(true)}
                        className="mt-1 text-[11px] text-white/25 transition hover:text-orange-400"
                    >
                        + Add comment
                    </button>
                )
            ) : (
                <Link href="/login" className="mt-1 text-[11px] text-white/25 transition hover:text-orange-400">
                    Log in to comment
                </Link>
            )}
        </div>
    );
}

// ─── Single answer card ───────────────────────────────────────────────────────

function AnswerCard({
    answer,
    questionAuthorId,
    onDelete,
}: {
    answer: Answer;
    questionAuthorId: string;
    onDelete: (id: string) => void;
}) {
    const { user } = useAuthStore();
    const isAuthor = user?.$id === answer.authorId;
    const isAccepted = false;
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!user || !confirm("Delete this answer?")) return;
        setDeleting(true);
        try {
            const res = await fetch("/api/answer", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answerId: answer.$id, authorId: user.$id }),
            });
            if (res.ok) onDelete(answer.$id);
        } catch { }
        setDeleting(false);
    };

    return (
        <div className={`relative rounded-2xl border px-5 py-5 transition-colors ${isAccepted ? "border-emerald-500/25 bg-emerald-500/[0.03]" : "border-white/[0.06] bg-white/[0.02]"}`}>
            {isAccepted && (
                <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <IconCheck size={10} /> Accepted
                </div>
            )}

            <div className="flex items-start gap-5">
                <div className="shrink-0 pt-0.5">
                    <VoteButtons
                        type="answer"
                        typeId={answer.$id}
                        upvotes={answer.upvotes}
                        downvotes={answer.downvotes}
                        userVote={answer.userVote ?? null}
                        layout="vertical"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <div
                        className="md-body"
                        dangerouslySetInnerHTML={{ __html: renderMd(answer.content) }}
                    />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] text-white/30">
                            <IconUser size={11} />
                            <span className="font-medium text-white/50">{answer.authorName}</span>
                            {answer.authorReputation > 0 && (
                                <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-400">
                                    {answer.authorReputation} rep
                                </span>
                            )}
                            <IconClock size={11} />
                            <span>{timeAgo(answer.$createdAt)}</span>
                        </div>

                        {isAuthor && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-1 text-[11px] text-white/20 transition hover:text-red-400 disabled:opacity-40"
                            >
                                {deleting ? <IconLoader2 size={11} className="animate-spin" /> : <IconTrash size={11} />}
                                Delete
                            </button>
                        )}
                    </div>

                    <CommentThread
                        comments={answer.comments}
                        type="answer"
                        typeId={answer.$id}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AnswerSection({
    questionId,
    question,
    initialAnswers,
    initialQuestionComments,
    questionUpvotes,
    questionDownvotes,
}: Props) {
    const { user } = useAuthStore();
    const router = useRouter();

    const [answers, setAnswers] = useState<Answer[]>(initialAnswers);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [questionUserVote, setQuestionUserVote] = useState<"upvoted" | "downvoted" | null>(null);

    // Fetch current user's vote on the question
    useEffect(() => {
        if (!user) return;
        fetch(`/api/vote/user?type=question&typeId=${questionId}&votedById=${user.$id}`)
            .then(r => r.json())
            .then(d => setQuestionUserVote(d.voteStatus ?? null))
            .catch(() => { });
    }, [user, questionId]);

    // Fetch current user's vote on each answer
    useEffect(() => {
        if (!user) return;
        initialAnswers.forEach(ans => {
            fetch(`/api/vote/user?type=answer&typeId=${ans.$id}&votedById=${user.$id}`)
                .then(r => r.json())
                .then(d => {
                    setAnswers(prev => prev.map(a =>
                        a.$id === ans.$id ? { ...a, userVote: d.voteStatus ?? null } : a
                    ));
                })
                .catch(() => { });
        });
    }, [user, initialAnswers]);

    const removeAnswer = useCallback((id: string) => {
        setAnswers((prev) => prev.filter((a) => a.$id !== id));
    }, []);

    const submitAnswer = async () => {
        if (!user) { router.push("/login"); return; }
        if (!content.trim() || content.trim().length < 10) {
            setError("Answer must be at least 10 characters.");
            return;
        }
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    answer: content.trim(),
                    questionId,
                    authorId: user.$id,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Failed to post answer");
            }

            const doc = await res.json();
            setAnswers((prev) => [
                ...prev,
                {
                    $id: doc.$id,
                    $createdAt: doc.$createdAt,
                    content: doc.content,
                    authorId: doc.authorId,
                    authorName: user.name ?? user.$id.slice(0, 8),
                    authorReputation: (user.prefs as any)?.reputation ?? 0,
                    upvotes: 0,
                    downvotes: 0,
                    comments: [],
                    userVote: null,
                },
            ]);
            setContent("");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            {/* ── Question vote buttons (client, so userVote works) ── */}
            {/* <div className="mb-8 flex justify-center">
                <VoteButtons
                    type="question"
                    typeId={questionId}
                    upvotes={questionUpvotes}
                    downvotes={questionDownvotes}
                    userVote={questionUserVote}
                    layout="vertical"
                />
            </div> */}

            {/* ── Answers header ── */}
            <div className="mb-5 flex items-center gap-2">
                <IconMessageCircle size={16} className="text-orange-400" />
                <h2 className="text-sm font-semibold text-white/70">
                    {answers.length} Answer{answers.length !== 1 ? "s" : ""}
                </h2>
            </div>

            {/* ── Answer list ── */}
            {answers.length > 0 ? (
                <div className="mb-10 space-y-4">
                    {answers.map((ans) => (
                        <AnswerCard
                            key={ans.$id}
                            answer={ans}
                            questionAuthorId={question.authorId}
                            onDelete={removeAnswer}
                        />
                    ))}
                </div>
            ) : (
                <div className="mb-10 rounded-xl border border-white/[0.05] bg-white/[0.02] py-10 text-center">
                    <p className="text-sm text-white/30">No answers yet — be the first!</p>
                </div>
            )}

            {/* ── Post answer ── */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <h3 className="mb-4 text-sm font-semibold text-white/70">Your Answer</h3>

                {user ? (
                    <>
                        <RTE
                            value={content}
                            onChange={setContent}
                            placeholder="Write your answer here… Use **bold**, `code`, and ``` fenced blocks."
                            minHeight={260}
                        />

                        {error && (
                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
                                <IconAlertCircle size={13} />
                                {error}
                            </div>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-[11px] text-white/25">
                                Markdown supported · Be thorough and specific
                            </p>
                            <button
                                onClick={submitAnswer}
                                disabled={submitting}
                                className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.25)] transition hover:bg-orange-400 hover:shadow-[0_0_28px_rgba(249,115,22,0.35)] disabled:opacity-50"
                            >
                                {submitting ? (
                                    <IconLoader2 size={14} className="animate-spin" />
                                ) : (
                                    <IconSend size={14} />
                                )}
                                Post Answer
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-10 text-center">
                        <p className="mb-3 text-sm text-white/40">
                            You need to be logged in to answer.
                        </p>
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
                        >
                            Log in to answer
                        </Link>
                    </div>
                )}
            </div>

            <style>{`
        .md-body { color: rgba(255,255,255,0.75); font-size: 0.875rem; line-height: 1.8; }
        .md-body p { margin: 0.75em 0; }
        .md-body .md-h1 { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 1.2em 0 0.5em; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 0.3em; }
        .md-body .md-h2 { font-size: 1.1rem; font-weight: 600; color: rgba(255,255,255,0.88); margin: 1.1em 0 0.4em; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.25em; }
        .md-body .md-h3 { font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.85); margin: 1em 0 0.35em; }
        .md-body .code-block { background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 1rem 1.25rem; overflow-x: auto; margin: 1em 0; }
        .md-body .code-block code { color: rgba(255,255,255,0.82); font-size: 0.8rem; line-height: 1.7; font-family: ui-monospace, monospace; }
        .md-body .inline-code { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.09); border-radius: 4px; padding: 0.15em 0.45em; font-size: 0.8rem; color: rgb(134,239,172); font-family: ui-monospace, monospace; }
        .md-body .md-bq { border-left: 3px solid rgba(249,115,22,0.45); background: rgba(249,115,22,0.04); border-radius: 0 6px 6px 0; margin: 1em 0; padding: 0.5em 1em; color: rgba(255,255,255,0.45); }
        .md-body .md-li { margin: 0.3em 0 0.3em 1.5em; list-style-type: disc; }
        .md-body .md-oli { list-style-type: decimal; }
        .md-body .md-hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 1.5em 0; }
        .md-body .md-link { color: rgb(147,197,253); text-decoration: underline; text-underline-offset: 2px; }
        .md-body .md-img { max-width: 100%; border-radius: 8px; margin: 0.75em 0; }
        .md-body strong { color: rgba(255,255,255,0.92); font-weight: 600; }
        .md-body em { color: rgba(255,255,255,0.65); font-style: italic; }
      `}</style>
        </>
    );
}