"use client";

import Link from "next/link";
import { Models } from "node-appwrite";
import {
  IconMessageCircle,
  IconArrowUp,
  IconClock,
  IconUser,
  IconPaperclip,
  IconTag,
} from "@tabler/icons-react";

// question-card.tsx
interface QuestionCardProps {
  question: {
    $id: string;
    $createdAt: string;
    attachmentId?: string;
    title: string;
    content: string;
    tags?: string[];
    authorId?: string;
  };
  totalAnswers: number;
  totalVotes: number;
  authorName?: string;
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function QuestionCard({
  question,
  totalAnswers,
  totalVotes,
  authorName,
}: QuestionCardProps) {
  const hasAttachment = Boolean(question.attachmentId);
  const tags: string[] = question.tags ?? [];
  const excerpt = (question.content as string)
    ?.replace(/#{1,6}\s/g, "")
    .replace(/[*`_~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 180);

  return (
    <Link href={`/questions/${question.$id}`} className="group block outline-none">
      <article className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4 transition-all duration-200 hover:border-orange-500/25 hover:bg-white/[0.04] focus-within:ring-1 focus-within:ring-orange-500/30">

        {/* Hover accent line */}
        <span className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-2xl bg-gradient-to-b from-orange-500/0 via-orange-400/0 to-orange-500/0 transition-all duration-300 group-hover:from-orange-500 group-hover:via-orange-400/60 group-hover:to-orange-500/0" />

        <div className="flex items-start gap-5">

          {/* ── Stats column ── */}
          <div className="hidden shrink-0 flex-col items-center gap-3 pt-0.5 sm:flex">

            {/* Vote score */}
            <div className="flex flex-col items-center gap-0.5 min-w-[2.5rem]">
              <span
                className={`text-base font-bold tabular-nums leading-none ${
                  totalVotes > 0
                    ? "text-orange-400"
                    : totalVotes < 0
                    ? "text-red-400/80"
                    : "text-white/25"
                }`}
              >
                {totalVotes > 0 ? `+${totalVotes}` : totalVotes}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-white/20">
                votes
              </span>
            </div>

            {/* Answer count */}
            <div
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 ${
                totalAnswers > 0
                  ? "bg-emerald-500/10 ring-1 ring-emerald-500/20"
                  : "ring-1 ring-white/5"
              }`}
            >
              <span
                className={`text-sm font-bold tabular-nums leading-none ${
                  totalAnswers > 0 ? "text-emerald-400" : "text-white/25"
                }`}
              >
                {totalAnswers}
              </span>
              <span
                className={`text-[9px] uppercase tracking-widest ${
                  totalAnswers > 0 ? "text-emerald-400/50" : "text-white/20"
                }`}
              >
                ans
              </span>
            </div>
          </div>

          {/* ── Main content ── */}
          <div className="min-w-0 flex-1">

            {/* Title row */}
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 text-[0.9rem] font-semibold leading-snug text-white/85 transition-colors duration-150 group-hover:text-white">
                {question.title}
              </h2>
              {hasAttachment && (
                <IconPaperclip
                  size={13}
                  className="mt-0.5 shrink-0 text-white/25"
                  title="Has attachment"
                />
              )}
            </div>

            {/* Excerpt */}
            {excerpt && (
              <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-white/35">
                {excerpt}
              </p>
            )}

            {/* Bottom row */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-0.5 rounded-md border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/40 transition hover:border-orange-500/30 hover:text-orange-400/80"
                  >
                    <IconTag size={9} className="opacity-60" />
                    {tag}
                  </span>
                ))}
                {tags.length > 4 && (
                  <span className="inline-flex items-center rounded-md border border-white/8 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/25">
                    +{tags.length - 4}
                  </span>
                )}
              </div>

              {/* Meta — right-aligned */}
              <div className="ml-auto flex items-center gap-3 text-[11px] text-white/25">
                {/* Mobile-only vote + answer stats */}
                <span className="flex items-center gap-1 sm:hidden">
                  <IconArrowUp size={11} />
                  {totalVotes}
                </span>
                <span className="flex items-center gap-1 sm:hidden">
                  <IconMessageCircle size={11} />
                  {totalAnswers}
                </span>

                {/* Author */}
                <span className="flex items-center gap-1">
                  <IconUser size={11} className="shrink-0" />
                  <span className="max-w-[100px] truncate">
                    {authorName ?? question.authorId?.slice(0, 8)}
                  </span>
                </span>

                {/* Timestamp */}
                <span className="flex items-center gap-1">
                  <IconClock size={11} className="shrink-0" />
                  {timeAgo(question.$createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
