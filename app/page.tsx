import { databases, users } from "@/app/models/server/config";
import {
  db,
  questionsCollection,
  answerCollection,
  voteCollection,
} from "@/app/models/name";
import { Query, Models } from "node-appwrite";
import Link from "next/link";
import QuestionCard from "./components/QuestionCard";
import {
  IconPlus,
  IconFlame,
  IconClock,
  IconTrendingUp,
  IconSearch,
  IconTag,
} from "@tabler/icons-react";

const POPULAR_TAGS = [
  "javascript",
  "typescript",
  "react",
  "nextjs",
  "nodejs",
  "python",
  "css",
  "tailwindcss",
  "appwrite",
  "database",
  "api",
  "git",
];
interface QuestionDocument extends Models.Document {
  authorId: string;
  title: string;
  content: string;
  tags: string[];
  attachmentId?: string | null;
}
const PAGE_SIZE = 10;

async function getQuestions(
  search: string,
  tag: string,
  sort: string,
  page: number
) {
  const queries: string[] = [
    Query.limit(PAGE_SIZE),
    Query.offset((page - 1) * PAGE_SIZE),
  ];

  if (search) {
    queries.push(Query.search("title", search));
  }

  if (tag) {
    queries.push(Query.contains("tags", [tag]));
  }

  // SORTING
  if (sort === "oldest") {
    queries.push(Query.orderAsc("$createdAt"));
  } else {
    queries.push(Query.orderDesc("$createdAt"));
  }

  // Fetch questions first
  const result = await databases.listDocuments(
    db,
    questionsCollection,
    queries
  );

  let documents = result.documents;

  // MOST VOTED
  if (sort === "votes") {
    const docsWithVotes = await Promise.all(
      documents.map(async (q) => {
        const votes = await getVoteScore(q.$id);

        return {
          ...q,
          voteCount: votes,
        };
      })
    );

    docsWithVotes.sort((a, b) => b.voteCount - a.voteCount);

    documents = docsWithVotes;
  }

  // UNANSWERED
  if (sort === "unanswered") {
    const docsWithAnswers = await Promise.all(
      documents.map(async (q) => {
        const answers = await getAnswerCount(q.$id);

        return {
          ...q,
          answerCount: answers,
        };
      })
    );

    documents = docsWithAnswers.filter((q) => q.answerCount === 0);
  }

  return {
    ...result,
    documents,
  };
}
async function getTotalAnswers() {
  const result = await databases.listDocuments(db, answerCollection, [
    Query.limit(1),
  ]);
  return result.total;
}

async function getTotalUsers() {
  const result = await users.list([Query.limit(1)]);
  return result.total;
}
async function getAnswerCount(questionId: string) {
  const result = await databases.listDocuments(db, answerCollection, [
    Query.equal("questionId", questionId),
    Query.limit(1),
  ]);
  return result.total;
}

async function getVoteScore(questionId: string) {
  const [up, down] = await Promise.all([
    databases.listDocuments(db, voteCollection, [
      Query.equal("type", "question"),
      Query.equal("typeId", questionId),
      Query.equal("voteStatus", "upvoted"),
      Query.limit(1),
    ]),
    databases.listDocuments(db, voteCollection, [
      Query.equal("type", "question"),
      Query.equal("typeId", questionId),
      Query.equal("voteStatus", "downvoted"),
      Query.limit(1),
    ]),
  ]);
  return up.total - down.total;
}

interface HomeProps {
  searchParams: Promise<{
    search?: string;
    tag?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomeProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const tag = params.tag ?? "";
  const sort = params.sort ?? "newest";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  let questions: Models.DocumentList<Models.Document> | null = null;
  let error = "";
  let totalAnswers = 0;
  let totalUsers = 0;

  try {
    [questions, totalAnswers, totalUsers] = await Promise.all([
      getQuestions(search, tag, sort, page),
      getTotalAnswers(),
      getTotalUsers(),
    ]);
  } catch (e: any) {
    error = e?.message ?? "Failed to load questions";
  }

  const enriched = questions
    ? await Promise.all(
      (questions.documents as QuestionDocument[]).map(async (q) => {
        const [totalAnswers, totalVotes, authorInfo] = await Promise.all([
          getAnswerCount(q.$id),
          getVoteScore(q.$id),
          users.get(q.authorId).catch(() => null),
        ]);

        return {
          question: q,
          totalAnswers,
          totalVotes,
          authorName: authorInfo?.name ?? undefined,
        };
      })
    )
    : [];

  const totalPages = questions ? Math.ceil(questions.total / PAGE_SIZE) : 1;

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(tag ? { tag } : {}),
      sort,
      page: String(page),
      ...overrides,
    });
    return `/?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex gap-8">
        {/* ── Main column ── */}
        <div className="min-w-0 flex-1">
          {/* Page header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                {search
                  ? `Results for "${search}"`
                  : tag
                    ? `Questions tagged [${tag}]`
                    : "All Questions"}
              </h1>
              {questions && (
                <p className="mt-0.5 text-sm text-white/40">
                  {questions.total.toLocaleString()} question
                  {questions.total !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Link
              href="/questions/ask"
              className="flex w-fit items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              <IconPlus size={15} />
              Ask Question
            </Link>
          </div>

          {/* Sort tabs */}
          <div className="mb-4 flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] p-1">
            {(
              [
                { key: "newest", label: "Newest", icon: IconClock },
                { key: "votes", label: "Most Voted", icon: IconFlame },
                { key: "unanswered", label: "Unanswered", icon: IconTrendingUp },
                { key: "oldest", label: "Oldest", icon: IconClock },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <Link
                key={key}
                href={buildUrl({ sort: key, page: "1" })}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${sort === key
                  ? "bg-orange-500 text-white"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70"
                  }`}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>

          {/* Active tag / search pills */}
          {(tag || search) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {tag && (
                <div className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-400">
                  <IconTag size={11} />
                  {tag}
                  <Link
                    href={buildUrl({ tag: "", page: "1" })}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    ✕
                  </Link>
                </div>
              )}
              {search && (
                <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50">
                  <IconSearch size={11} />
                  {search}
                  <Link
                    href={buildUrl({ search: "", page: "1" })}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    ✕
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Question list */}
          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-red-400">
              {error}
            </div>
          ) : enriched.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] py-16 text-center">
              <div className="mb-3 text-4xl">🔍</div>
              <p className="text-sm font-medium text-white/50">
                No questions found
              </p>
              <p className="mt-1 text-xs text-white/25">
                {search || tag
                  ? "Try a different search or tag"
                  : "Be the first to ask!"}
              </p>
              <Link
                href="/questions/ask"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-400"
              >
                <IconPlus size={13} />
                Ask a Question
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {enriched.map(({ question, totalAnswers, totalVotes, authorName }) => (
                <QuestionCard
                  key={question.$id}
                  question={{ ...question }}
                  totalAnswers={totalAnswers}
                  totalVotes={totalVotes}
                  authorName={authorName}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white"
                >
                  ← Prev
                </Link>
              )}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <Link
                      key={pageNum}
                      href={buildUrl({ page: String(pageNum) })}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition ${pageNum === page
                        ? "bg-orange-500 font-semibold text-white"
                        : "border border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
                        }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
              </div>
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white"
                >
                  Next →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="hidden w-64 shrink-0 lg:block">
          {/* Popular tags */}
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40">
              <IconTag size={12} />
              Popular Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_TAGS.map((t) => (
                <Link
                  key={t}
                  href={buildUrl({ tag: t, page: "1" })}
                 className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
  tag === t
    ? "border-orange-500/50 bg-orange-500/15 text-orange-400"
    : "border-black/10 bg-black/5 text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/45 hover:border-orange-500/30 hover:text-orange-400"
}`}
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>

          {/* Community stats */}
          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
              Community
            </h3>
            <div className="space-y-2">
              {[
                {
                  label: "Questions",
                  value: questions?.total ?? 0,
                  color: "text-orange-400",
                },
                { label: "Answers", value: totalAnswers, color: "text-emerald-400" },
                { label: "Users", value: totalUsers, color: "text-blue-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-white/40">{label}</span>
                  <span className={`text-xs font-semibold ${color}`}>
                    {typeof value === "number"
                      ? value.toLocaleString()
                      : value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ask CTA */}
          <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
            <p className="mb-3 text-xs leading-relaxed text-white/50">
              Got a question? The community is here to help.
            </p>
            <Link
              href="/questions/ask"
              className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-400"
            >
              <IconPlus size={13} />
              Ask a Question
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
