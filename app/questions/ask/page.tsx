"use client";

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/app/store/Auth";
import { storage } from "@/app/models/client/config";
import { questionAttachementBucket } from "@/app/models/name";
import { ID } from "appwrite";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  IconArrowLeft,
  IconTag,
  IconX,
  IconPhoto,
  IconLoader2,
  IconAlertCircle,
  IconInfoCircle,
  IconCheck,
  IconEye,
} from "@tabler/icons-react";

const RTE = dynamic(() => import("@/app/components/RTE"), { ssr: false });

// ── Tag suggestions ──────────────────────────────────────────────────────────
const TAG_SUGGESTIONS = [
  "javascript", "typescript", "react", "nextjs", "nodejs",
  "python", "css", "tailwindcss", "appwrite", "database",
  "api", "git", "html", "docker", "rust", "golang", "java",
  "sql", "mongodb", "graphql", "auth", "deployment", "testing",
];

function slugifyTag(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 35);
}

const STEPS = [
  { num: 1, label: "Title",       hint: "Be specific — summarise the exact problem" },
  { num: 2, label: "Description", hint: "Include all details, code, and what you tried" },
  { num: 3, label: "Tags",        hint: "Add up to 5 relevant keywords" },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AskPage() {
  const router   = useRouter();
  const { user } = useAuthStore();

  const [title,          setTitle]          = useState("");
  const [content,        setContent]        = useState("");
  const [tags,           setTags]           = useState<string[]>([]);
  const [tagInput,       setTagInput]       = useState("");
  const [tagSuggestOpen, setTagSuggestOpen] = useState(false);

  const [attachment,        setAttachment]        = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting,  setSubmitting]  = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  React.useEffect(() => {
    if (user === null) router.push("/login");
  }, [user, router]);

  const activeStep = title.trim() ? (content.trim() ? 3 : 2) : 1;

  // ── Tag helpers ──────────────────────────────────────────────────────────
  const addTag = useCallback((raw: string) => {
    const tag = slugifyTag(raw);
    if (!tag || tags.includes(tag) || tags.length >= 5) return;
    setTags(prev => [...prev, tag]);
    setTagInput("");
    setTagSuggestOpen(false);
  }, [tags]);

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key)) {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const filteredSuggestions = TAG_SUGGESTIONS.filter(
    s => s.includes(tagInput.toLowerCase()) && !tags.includes(s) && tagInput.length > 0
  ).slice(0, 8);

  // ── Attachment helpers ───────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors(p => ({ ...p, attachment: "Only image files are allowed" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(p => ({ ...p, attachment: "Image must be under 5 MB" }));
      return;
    }
    setAttachment(file);
    setErrors(p => { const n = { ...p }; delete n.attachment; return n; });
    const reader = new FileReader();
    reader.onload = () => setAttachmentPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRTEImageUpload = useCallback(async (file: File): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    const uploaded = await storage.createFile(questionAttachementBucket, ID.unique(), file);
    return storage.getFilePreview(questionAttachementBucket, uploaded.$id).toString();
  }, [user]);

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim())                     e.title   = "Title is required";
    else if (title.trim().length < 15)     e.title   = "Title must be at least 15 characters";
    else if (title.trim().length > 100)    e.title   = "Title must be under 100 characters";
    if (!content.trim())                   e.content = "Description is required";
    else if (content.trim().length < 30)   e.content = "Description must be at least 30 characters";
    if (tags.length === 0)                 e.tags    = "Add at least one tag";
    return e;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      document.getElementById(`${firstKey}-section`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setGlobalError("");

    try {
      let attachmentId: string | undefined;

      if (attachment) {
        const uploaded = await storage.createFile(questionAttachementBucket, ID.unique(), attachment);
        attachmentId = uploaded.$id;
      }

      const res = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:   title.trim(),
          content: content.trim(),
          authorId: user.$id,
          tags,
          ...(attachmentId ? { attachmentId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post question");
      }

      const question = await res.json();
      router.push(`/questions/${question.$id}`);
    } catch (err: any) {
      setGlobalError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">

      {/* Page header */}
      <div className="mb-8">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-white/35 transition hover:text-white/65"
        >
          <IconArrowLeft size={13} />
          Back to questions
        </Link>
        <h1 className="text-2xl font-bold text-white">Ask a Question</h1>
        <p className="mt-1 text-sm text-white/40">
          Get help from the community. Be specific and provide as much context as possible.
        </p>
      </div>

      <div className="flex gap-8">

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="min-w-0 flex-1 space-y-5" noValidate>

          {/* Global error */}
          {globalError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-400">
              <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
              {globalError}
            </div>
          )}

          {/* ── Title ──────────────────────────────────────────────────────── */}
          <section
            id="title-section"
            className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"
          >
            <label className="mb-1 block text-sm font-semibold text-white/80">
              Title <span className="text-red-400">*</span>
            </label>
            <p className="mb-3 text-xs text-white/35">
              State the specific problem clearly — imagine you're asking a colleague.
            </p>
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (errors.title) setErrors(p => { const n = { ...p }; delete n.title; return n; });
              }}
              maxLength={150}
              placeholder="e.g. How do I query nested arrays in Appwrite?"
              className={`w-full rounded-xl border bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition ${
                errors.title
                  ? "border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                  : "border-white/10 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20"
              }`}
            />
            <div className="mt-1.5 flex items-center justify-between">
              {errors.title
                ? <p className="flex items-center gap-1 text-xs text-red-400"><IconAlertCircle size={12} />{errors.title}</p>
                : <span />
              }
              <span className={`text-xs tabular-nums ${title.length > 90 ? "text-orange-400" : "text-white/20"}`}>
                {title.length}/100
              </span>
            </div>
          </section>

          {/* ── Description / RTE ──────────────────────────────────────────── */}
          <section
            id="content-section"
            className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"
          >
            <label className="mb-1 block text-sm font-semibold text-white/80">
              Description <span className="text-red-400">*</span>
            </label>
            <p className="mb-3 text-xs text-white/35">
              Include all relevant details, what you've tried, and your expected result. Markdown supported.
            </p>

            <RTE
              value={content}
              onChange={val => {
                setContent(val);
                if (errors.content) setErrors(p => { const n = { ...p }; delete n.content; return n; });
              }}
              onImageUpload={handleRTEImageUpload}
              minHeight={340}
              placeholder={"## What I'm trying to do\n\n\n\n## What I've tried\n\n```\n// paste your code here\n```\n\n## Expected vs actual result\n\n"}
            />

            {errors.content && (
              <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                <IconAlertCircle size={12} />{errors.content}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/25">
              <span className="flex items-center gap-1"><IconInfoCircle size={11} />Paste images directly to embed them</span>
              <span>Use <code className="rounded bg-white/5 px-1 text-white/40">```language</code> for code blocks</span>
            </div>
          </section>

          {/* ── Tags ───────────────────────────────────────────────────────── */}
          <section
            id="tags-section"
            className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"
          >
            <label className="mb-1 block text-sm font-semibold text-white/80">
              Tags <span className="text-red-400">*</span>
            </label>
            <p className="mb-3 text-xs text-white/35">
              Add up to 5 keywords. Press{" "}
              <kbd className="rounded border border-white/10 bg-white/5 px-1 text-[10px]">Enter</kbd>{" "}
              or <kbd className="rounded border border-white/10 bg-white/5 px-1 text-[10px]">Space</kbd> after each.
            </p>

            {/* Pill input */}
            <div className={`relative flex flex-wrap items-center gap-1.5 rounded-xl border bg-white/[0.04] px-3 py-2.5 transition ${
              errors.tags
                ? "border-red-500/50"
                : "border-white/10 focus-within:border-orange-500/40 focus-within:ring-1 focus-within:ring-orange-500/20"
            }`}>
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-400">
                  <IconTag size={10} />
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 opacity-60 transition hover:opacity-100">
                    <IconX size={10} />
                  </button>
                </span>
              ))}

              {tags.length < 5 && (
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => {
                      setTagInput(e.target.value);
                      setTagSuggestOpen(true);
                      if (errors.tags) setErrors(p => { const n = { ...p }; delete n.tags; return n; });
                    }}
                    onKeyDown={handleTagKeyDown}
                    onFocus={() => setTagSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setTagSuggestOpen(false), 150)}
                    placeholder={tags.length === 0 ? "javascript, react, appwrite…" : ""}
                    className="min-w-[8rem] bg-transparent text-sm text-white outline-none placeholder-white/20"
                  />

                  {tagSuggestOpen && filteredSuggestions.length > 0 && (
                    <div className="absolute left-0 top-full z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
                      {filteredSuggestions.map(s => (
                        <button
                          key={s}
                          type="button"
                          onMouseDown={() => addTag(s)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/55 transition hover:bg-white/5 hover:text-white/90"
                        >
                          <IconTag size={11} className="shrink-0 text-orange-400/60" />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-1.5 flex items-center justify-between">
              {errors.tags
                ? <p className="flex items-center gap-1 text-xs text-red-400"><IconAlertCircle size={12} />{errors.tags}</p>
                : <span className="text-xs text-white/20">{tags.length}/5 tags used</span>
              }
            </div>

            {/* Quick-add popular tags */}
            {tags.length < 5 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] text-white/25">Popular tags:</p>
                <div className="flex flex-wrap gap-1.5">
                  {TAG_SUGGESTIONS.filter(s => !tags.includes(s)).slice(0, 12).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addTag(s)}
                      className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/35 transition hover:border-orange-500/30 hover:text-orange-400"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Attachment ─────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
            <label className="mb-1 block text-sm font-semibold text-white/80">
              Attachment
              <span className="ml-2 text-xs font-normal text-white/30">optional</span>
            </label>
            <p className="mb-3 text-xs text-white/35">
              Attach a screenshot or diagram. JPG, PNG, GIF, WebP — max 5 MB.
            </p>

            {attachmentPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                <img
                  src={attachmentPreview}
                  alt="preview"
                  className="max-h-64 w-full object-contain bg-white/[0.02]"
                />
                <button
                  type="button"
                  onClick={clearAttachment}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/70 backdrop-blur transition hover:text-white"
                >
                  <IconX size={13} />
                </button>
                <div className="border-t border-white/8 px-3 py-2 text-xs text-white/35">
                  {attachment?.name} · {((attachment?.size ?? 0) / 1024).toFixed(0)} KB
                </div>
              </div>
            ) : (
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center transition hover:border-orange-500/30 hover:bg-orange-500/[0.03]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <IconPhoto size={18} className="text-white/30" />
                </div>
                <p className="text-sm font-medium text-white/45">Click to upload an image</p>
                <p className="text-xs text-white/25">or drag and drop</p>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpg,image/jpeg,image/png,image/gif,image/webp,image/heic"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}

            {errors.attachment && (
              <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
                <IconAlertCircle size={12} />{errors.attachment}
              </p>
            )}
          </section>

          {/* ── Submit ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 pb-4">
            <Link
              href="/"
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-white/50 transition hover:border-white/20 hover:text-white/80"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? <><IconLoader2 size={15} className="animate-spin" />Posting…</>
                : <><IconCheck size={15} />Post Question</>
              }
            </button>
          </div>
        </form>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="hidden w-72 shrink-0 xl:block">
          <div className="sticky top-20 space-y-4">

            {/* Step tracker */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/35">
                Writing a good question
              </h3>
              <div className="space-y-4">
                {STEPS.map(({ num, label, hint }) => {
                  const done   = activeStep > num;
                  const active = activeStep === num;
                  return (
                    <div key={num} className="flex gap-3">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition ${
                        done   ? "bg-emerald-500/20 text-emerald-400" :
                        active ? "bg-orange-500/20 text-orange-400 ring-1 ring-orange-500/40" :
                                 "bg-white/5 text-white/20"
                      }`}>
                        {done ? <IconCheck size={10} /> : num}
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${done ? "text-emerald-400" : active ? "text-white/80" : "text-white/25"}`}>
                          {label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-white/25">{hint}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Markdown tips */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35">
                Markdown tips
              </h3>
              <div className="space-y-2">
                {[
                  ["**bold**",        "bold text"],
                  ["`code`",          "inline code"],
                  ["```js code```",   "code block"],
                  ["## Heading",      "section heading"],
                  ["- item",          "bullet list"],
                  ["> quote",         "blockquote"],
                  ["![alt](url)",     "image"],
                ].map(([syntax, desc]) => (
                  <div key={syntax} className="flex items-center justify-between gap-2">
                    <code className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-white/50">
                      {syntax}
                    </code>
                    <span className="text-xs text-white/25">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview tip */}
            <div className="flex items-start gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5 text-xs text-white/30">
              <IconEye size={13} className="mt-0.5 shrink-0 text-white/20" />
              Click the preview icon in the editor toolbar to see how your question will look.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
