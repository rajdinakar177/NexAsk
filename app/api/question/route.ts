import {
  questionsCollection,
  answerCollection,
  commentCollection,
  voteCollection,
  questionAttachementBucket,
  db,
} from "@/app/models/name";
import { databases, storage, users } from "@/app/models/server/config";
import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { UserPref } from "@/app/store/Auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Delete ALL documents in a collection matching queries, paginating until done. */
async function deleteAllMatching(
  collectionId: string,
  queries: string[]
): Promise<void> {
  while (true) {
    const batch = await databases.listDocuments(db, collectionId, [
      ...queries,
      Query.limit(100),
    ]);
    if (batch.documents.length === 0) break;
    await Promise.all(
      batch.documents.map((doc) =>
        databases.deleteDocument(db, collectionId, doc.$id)
      )
    );
    if (batch.documents.length < 100) break;
  }
}

/** Delete all votes for a given type + typeId. */
async function deleteVotesFor(type: "question" | "answer", typeId: string) {
  await deleteAllMatching(voteCollection, [
    Query.equal("type", type),
    Query.equal("typeId", typeId),
  ]);
}

/** Delete all comments for a given type + typeId. */
async function deleteCommentsFor(type: "question" | "answer", typeId: string) {
  await deleteAllMatching(commentCollection, [
    Query.equal("type", type),
    Query.equal("typeId", typeId),
  ]);
}

// ── POST /api/question ────────────────────────────────────────────────────────
// Body: { title, content, authorId, tags, attachmentId? }
export async function POST(request: NextRequest) {
  try {
    const { title, content, authorId, tags, attachmentId } =
      await request.json();

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (title.trim().length < 15) {
      return NextResponse.json(
        { error: "Title must be at least 15 characters" },
        { status: 400 }
      );
    }
    if (title.trim().length > 100) {
      return NextResponse.json(
        { error: "Title must be under 100 characters" },
        { status: 400 }
      );
    }
    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }
    if (content.trim().length < 30) {
      return NextResponse.json(
        { error: "Content must be at least 30 characters" },
        { status: 400 }
      );
    }
    if (!authorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!tags?.length) {
      return NextResponse.json(
        { error: "At least one tag is required" },
        { status: 400 }
      );
    }
    if (tags.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 tags allowed" },
        { status: 400 }
      );
    }

    const question = await databases.createDocument(
      db,
      questionsCollection,
      ID.unique(),
      {
        title: title.trim(),
        content: content.trim(),
        authorId,
        tags,
        ...(attachmentId ? { attachmentId } : {}),
      }
    );

    // Reputation +2 for asking
    const prefs = await users.getPrefs<UserPref>(authorId);
    await users.updatePrefs(authorId, {
      reputation: Number(prefs.reputation || 0) + 2,
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error creating question" },
      { status: error?.status || error?.code || 500 }
    );
  }
}

// ── DELETE /api/question ──────────────────────────────────────────────────────
// Body: { questionId, authorId }
// Cascade: deletes all answers (+ their votes/comments), all question-level
// votes, all question-level comments, and the storage attachment.
export async function DELETE(request: NextRequest) {
  try {
    const { questionId, authorId } = await request.json();

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }
    if (!authorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch question to verify ownership
    const question = await databases.getDocument(
      db,
      questionsCollection,
      questionId
    );

    if (question.authorId !== authorId) {
      return NextResponse.json(
        { error: "You can only delete your own questions" },
        { status: 403 }
      );
    }

    // 1. Fetch all answers for this question
    const answersResult = await databases.listDocuments(db, answerCollection, [
      Query.equal("questionId", questionId),
      Query.limit(500),
    ]);

    // 2. For each answer: delete its votes + comments
    await Promise.all(
      answersResult.documents.map(async (answer) => {
        await Promise.all([
          deleteVotesFor("answer", answer.$id),
          deleteCommentsFor("answer", answer.$id),
        ]);
      })
    );

    // 3. Delete all answers
    await Promise.all(
      answersResult.documents.map((answer) =>
        databases.deleteDocument(db, answerCollection, answer.$id)
      )
    );

    // 4. Delete question-level votes + comments (parallel)
    await Promise.all([
      deleteVotesFor("question", questionId),
      deleteCommentsFor("question", questionId),
    ]);

    // 5. Delete storage attachment (non-fatal)
    if (question.attachmentId) {
      try {
        await storage.deleteFile(questionAttachementBucket, question.attachmentId);
      } catch {
        // File may already be gone — not fatal
      }
    }

    // 6. Delete the question itself
    await databases.deleteDocument(db, questionsCollection, questionId);

    // 7. Reduce author reputation
    const prefs = await users.getPrefs<UserPref>(authorId);
    await users.updatePrefs(authorId, {
      reputation: Math.max(0, Number(prefs.reputation || 0) - 2),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error deleting question" },
      { status: error?.status || error?.code || 500 }
    );
  }
}
