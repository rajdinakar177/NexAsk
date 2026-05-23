"use server";

import { databases, users, storage } from "@/app/models/server/config";
import {
  db,
  questionsCollection,
  answerCollection,
  commentCollection,
  voteCollection,
  questionAttachementBucket,
} from "@/app/models/name";
import { Query } from "node-appwrite";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconClock,
  IconUser,
  IconTag,
  IconPaperclip,
  IconMessageCircle,
  IconCheck,
} from "@tabler/icons-react";
// import { timeAgo } from "@/app/components/QuestionCard";
import VoteButtons from "@/app/components/VoteButtons";
import AttachmentPreview from "@/app/questions/[questionId]/AttachmentPreview";
import AnswerSection from "@/app/questions/[questionId]/AnswerSection";
import env from "@/app/env";
function timeAgo(dateString: string): string {
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
// ─── helpers ────────────────────────────────────────────────────────────────
// Add this function inside your component, before the return:
function handleAttachmentError(e: React.SyntheticEvent<HTMLImageElement>, url: string) {
  const wrapper = e.currentTarget.parentElement!;
  e.currentTarget.remove();
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 transition hover:border-orange-500/30 hover:text-orange-400";
  link.textContent = "📎 View attachment";
  wrapper.appendChild(link);
}
async function getVotes(type: "question" | "answer", typeId: string) {
  const [up, down] = await Promise.all([
    databases.listDocuments(db, voteCollection, [
      Query.equal("type", type),
      Query.equal("typeId", typeId),
      Query.equal("voteStatus", "upvoted"),
      Query.limit(1),
    ]),
    databases.listDocuments(db, voteCollection, [
      Query.equal("type", type),
      Query.equal("typeId", typeId),
      Query.equal("voteStatus", "downvoted"),
      Query.limit(1),
    ]),
  ]);
  return { upvotes: up.total, downvotes: down.total };
}

async function getComments(type: "question" | "answer", typeId: string) {
  const res = await databases.listDocuments(db, commentCollection, [
    Query.equal("type", type),
    Query.equal("typeId", typeId),
    Query.orderAsc("$createdAt"),
    Query.limit(50),
  ]);

  const enriched = await Promise.all(
    res.documents.map(async (c) => {
      const author = await users.get(c.authorId).catch(() => null);
      return { ...c, authorName: author?.name ?? c.authorId.slice(0, 8) };
    })
  );
  return enriched;
}

function getAttachmentUrl(attachmentId: string) {
  return `${env.ENDPOINT}/storage/buckets/${questionAttachementBucket}/files/${attachmentId}/view?project=${env.PROJECT_ID}`;
}

// ─── Markdown renderer (server-safe, no deps) ────────────────────────────────
// Simple regex-based renderer so we don't need a heavy markdown lib server-side.
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML entities first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Fenced code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="code-block" data-lang="${lang}"><code>${code.trim()}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="md-bq">$1</blockquote>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li class="md-li">$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="md-li md-oli">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="md-hr"/>')
    // Links
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
    )
    // Images
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="md-img"/>'
    )
    // Paragraphs: wrap non-tagged lines
    .replace(/^(?!<[a-zA-Z/]|$)(.+)$/gm, "<p>$1</p>")
    // Double newlines to spacing
    .replace(/\n\n+/g, "\n");

  return html;
}

// ─── Page ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ questionId: string }>;
}

export default async function QuestionDetailPage({ params }: PageProps) {
  const { questionId } = await params;

  // ── Fetch question ──────────────────────────────────────────────────────
  let question;
  try {
    question = await databases.getDocument(db, questionsCollection, questionId);
  } catch {
    notFound();
  }

  // ── Parallel data fetch ─────────────────────────────────────────────────
  const [
    questionVotes,
    questionComments,
    answersRes,
    questionAuthor,
  ] = await Promise.all([
    getVotes("question", questionId),
    getComments("question", questionId),
    databases.listDocuments(db, answerCollection, [
      Query.equal("questionId", questionId),
      Query.orderAsc("$createdAt"),
      Query.limit(100),
    ]),
    users.get(question.authorId).catch(() => null),
  ]);

  // ── Enrich answers ──────────────────────────────────────────────────────
  const answers = await Promise.all(
    answersRes.documents.map(async (ans) => {
      const [votes, comments, author] = await Promise.all([
        getVotes("answer", ans.$id),
        getComments("answer", ans.$id),
        users.get(ans.authorId).catch(() => null),
      ]);
      return {
        ...ans,
        upvotes: votes.upvotes,
        downvotes: votes.downvotes,
        comments,
        authorName: author?.name ?? ans.authorId.slice(0, 8),
        authorReputation: (author?.prefs as any)?.reputation ?? 0,
      };
    })
  );

  const tags: string[] = question.tags ?? [];
  const hasAttachment = Boolean(question.attachmentId);
  const attachmentUrl = hasAttachment
    ? getAttachmentUrl(question.attachmentId)
    : null;

  // Serialise for client components
  const plainAnswers = answers.map((a) => ({
    $id: a.$id,
    $createdAt: a.$createdAt,
    content: a.content as string,
    authorId: a.authorId as string,
    authorName: a.authorName,
    authorReputation: a.authorReputation,
    upvotes: a.upvotes,
    downvotes: a.downvotes,
    comments: a.comments.map((c) => ({
      $id: c.$id,
      $createdAt: c.$createdAt,
      content: c.content as string,
      authorId: c.authorId as string,
      authorName: c.authorName,
    })),
  }));

  const plainQuestion = {
    $id: question.$id,
    $createdAt: question.$createdAt,
    title: question.title as string,
    content: question.content as string,
    authorId: question.authorId as string,
    tags,
    attachmentId: question.attachmentId as string | undefined,
  };

  const plainQuestionComments = questionComments.map((c) => ({
    $id: c.$id,
    $createdAt: c.$createdAt,
    content: c.content as string,
    authorId: c.authorId as string,
    authorName: c.authorName,
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      {/* ── Back nav ── */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/35 transition hover:text-white/70"
      >
        <IconArrowLeft size={13} />
        Back to questions
      </Link>

      {/* ── Question block ── */}
      <article className="mb-8">
        {/* Title */}
        <h1 className="mb-4 text-xl font-bold leading-snug text-white/90 sm:text-2xl">
          {question.title as string}
        </h1>

        {/* Meta row */}
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/30">
          <span className="flex items-center gap-1">
            <IconClock size={11} />
            Asked {timeAgo(question.$createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <IconUser size={11} />
            {questionAuthor?.name ?? question.authorId.slice(0, 8)}
          </span>
          <span className="flex items-center gap-1">
            <IconMessageCircle size={11} />
            {answersRes.total} answer{answersRes.total !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-start gap-5">
          {/* Vote column */}
          {/* Vote column */}
          <div className="relative shrink-0 pt-1">
            <VoteButtons
              type="question"
              typeId={questionId}
              upvotes={questionVotes.upvotes}
              downvotes={questionVotes.downvotes}
              layout="vertical"
            />
          </div>

          {/* Content column */}
          <div className="min-w-0 flex-1">
          {/* Attachment */}
{attachmentUrl && <AttachmentPreview url={attachmentUrl} />}

            {/* Markdown body */}
            <div
              className="md-body prose-sm"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(question.content as string) }}
            />

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/40 transition hover:border-orange-500/30 hover:text-orange-400/80"
                  >
                    <IconTag size={9} className="opacity-60" />
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Question comments */}
            {plainQuestionComments.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
                {plainQuestionComments.map((c) => (
                  <div key={c.$id} className="flex gap-2 text-xs text-white/40">
                    <span className="shrink-0 font-medium text-white/55">
                      {c.authorName}
                    </span>
                    <span className="leading-relaxed">{c.content}</span>
                    <span className="ml-auto shrink-0 text-white/20">
                      {timeAgo(c.$createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Divider */}
      <div className="mb-8 border-t border-white/[0.06]" />

      {/* ── Answers + answer form (client island) ── */}
      <AnswerSection
        questionId={questionId}
        question={plainQuestion}
        initialAnswers={plainAnswers}
        initialQuestionComments={plainQuestionComments}
        questionUpvotes={questionVotes.upvotes}
        questionDownvotes={questionVotes.downvotes}
      />

      {/* Markdown styles */}
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
    </main>
  );
}
