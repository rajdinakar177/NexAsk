"use client";

import { useState } from "react";
import { useAuthStore } from "@/app/store/Auth";
import { useRouter } from "next/navigation";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface VoteButtonsProps {
  type: "question" | "answer";
  typeId: string;
  upvotes: number;
  downvotes: number;
  // The current user's existing vote on this item (passed from server)
  userVote?: "upvoted" | "downvoted" | null;
  // Layout: "vertical" (question detail sidebar) | "horizontal" (compact)
  layout?: "vertical" | "horizontal";
}

export default function VoteButtons({
  type,
  typeId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote = null,
  layout = "vertical",
}: VoteButtonsProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<"upvoted" | "downvoted" | null>(
    initialUserVote
  );
  const [loading, setLoading] = useState(false);

  const score = upvotes - downvotes;

  const handleVote = async (voteStatus: "upvoted" | "downvoted") => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (loading) return;
    setLoading(true);

    // Optimistic update
    const prev = { upvotes, downvotes, userVote };

    if (userVote === voteStatus) {
      // Toggle off
      setUserVote(null);
      if (voteStatus === "upvoted") setUpvotes((v) => v - 1);
      else setDownvotes((v) => v - 1);
    } else {
      // Switching vote
      if (userVote === "upvoted") setUpvotes((v) => v - 1);
      if (userVote === "downvoted") setDownvotes((v) => v - 1);

      setUserVote(voteStatus);
      if (voteStatus === "upvoted") setUpvotes((v) => v + 1);
      else setDownvotes((v) => v + 1);
    }

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voteStatus,
          votedById: user.$id,
          type,
          typeId,
        }),
      });

if (!res.ok) {
  const body = await res.json();
  throw new Error(body.error ?? "Vote failed");
}
      const { data } = await res.json();
      // Sync with server truth
      setUpvotes(data.upvotes);
      setDownvotes(data.downvotes);
    }  catch (err) {
      // Rollback
      setUpvotes(prev.upvotes);
      setDownvotes(prev.downvotes);
      setUserVote(prev.userVote);
      console.error("Vote error:", err);  // ← add this
    }finally {
      setLoading(false);
    }
  };

  if (layout === "horizontal") {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleVote("upvoted")}
          disabled={loading}
          title={user ? "Upvote" : "Login to vote"}
          className={cn(
            "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-all",
            userVote === "upvoted"
              ? "border-orange-500/50 bg-orange-500/15 text-orange-400"
              : "border-white/10 bg-white/5 text-white/40 hover:border-orange-500/30 hover:text-orange-400",
            loading && "pointer-events-none opacity-50"
          )}
        >
          <IconArrowUp size={13} />
          <span>{upvotes}</span>
        </button>

        <button
          onClick={() => handleVote("downvoted")}
          disabled={loading}
          title={user ? "Downvoted" : "Login to vote"}
          className={cn(
            "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-all",
            userVote === "downvoted"
              ? "border-red-500/50 bg-red-500/15 text-red-400"
              : "border-white/10 bg-white/5 text-white/40 hover:border-red-500/30 hover:text-red-400",
            loading && "pointer-events-none opacity-50"
          )}
        >
          <IconArrowDown size={13} />
          <span>{downvotes}</span>
        </button>
      </div>
    );
  }

  // Vertical layout (default — used in question/answer detail)
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Upvote */}
      <button
        onClick={() => handleVote("upvoted")}
        disabled={loading}
        title={user ? "Upvote" : "Login to vote"}
        className={cn(
          "group flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-150",
          userVote === "upvoted"
            ? "border-orange-500/60 bg-orange-500/20 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.25)]"
            : "border-white/10 bg-white/[0.03] text-white/30 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-400",
          loading && "pointer-events-none opacity-40"
        )}
      >
        <IconArrowUp
          size={16}
          className={cn(
            "transition-transform duration-150",
            !loading && "group-hover:-translate-y-0.5"
          )}
        />
      </button>

      {/* Score */}
      <div
        className={cn(
          "min-w-[2rem] text-center text-sm font-bold tabular-nums transition-colors",
          score > 0
            ? "text-orange-400"
            : score < 0
            ? "text-red-400"
            : "text-white/30"
        )}
      >
        {score > 0 ? `+${score}` : score}
      </div>

      {/* Downvote */}
      <button
        onClick={() => handleVote("downvoted")}
        disabled={loading}
        title={user ? "Downvote" : "Login to vote"}
        className={cn(
          "group flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-150",
          userVote === "downvoted"
            ? "border-red-500/60 bg-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
            : "border-white/10 bg-white/[0.03] text-white/30 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400",
          loading && "pointer-events-none opacity-40"
        )}
      >
        <IconArrowDown
          size={16}
          className={cn(
            "transition-transform duration-150",
            !loading && "group-hover:translate-y-0.5"
          )}
        />
      </button>

      {/* Loading pulse ring */}
      {loading && (
        <div className="absolute h-9 w-9 animate-ping rounded-xl border border-orange-500/20" />
      )}
    </div>
  );
}
