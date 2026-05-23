import { answerCollection, commentCollection, voteCollection, db } from "@/app/models/name";
import { databases, users } from "@/app/models/server/config";
import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { UserPref } from "@/app/store/Auth";

/** Delete all documents matching queries, paginating until done. */
async function deleteAllMatching(collectionId: string, queries: string[]) {
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

// ── POST /api/answer ──────────────────────────────────────────────────────────
// Body: { answer, questionId, authorId }
export async function POST(request: NextRequest) {
  try {
    const { answer, questionId, authorId } = await request.json();

    if (!answer?.trim()) {
      return NextResponse.json(
        { error: "Answer content is required" },
        { status: 400 }
      );
    }
    if (answer.trim().length < 10) {
      return NextResponse.json(
        { error: "Answer must be at least 10 characters" },
        { status: 400 }
      );
    }
    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }
    if (!authorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await databases.createDocument(
      db,
      answerCollection,
      ID.unique(),
      {
        content: answer.trim(),
        questionId,
        authorId,
      }
    );

    // Reputation +1 for answering
    const prefs = await users.getPrefs<UserPref>(authorId);
    await users.updatePrefs(authorId, {
      reputation: Number(prefs.reputation || 0) + 1,
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error creating answer" },
      { status: error?.status || error?.code || 500 }
    );
  }
}

// ── DELETE /api/answer ────────────────────────────────────────────────────────
// Body: { answerId, authorId }
// Cascade: deletes the answer's votes and comments before removing the answer.
export async function DELETE(request: NextRequest) {
  try {
    const { answerId, authorId } = await request.json();

    if (!answerId) {
      return NextResponse.json(
        { error: "answerId is required" },
        { status: 400 }
      );
    }
    if (!authorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch answer to verify ownership
    const answer = await databases.getDocument(db, answerCollection, answerId);

    if (answer.authorId !== authorId) {
      return NextResponse.json(
        { error: "You can only delete your own answers" },
        { status: 403 }
      );
    }

    // 1. Delete votes + comments on this answer (parallel)
    await Promise.all([
      deleteAllMatching(voteCollection, [
        Query.equal("type", "answer"),
        Query.equal("typeId", answerId),
      ]),
      deleteAllMatching(commentCollection, [
        Query.equal("type", "answer"),
        Query.equal("typeId", answerId),
      ]),
    ]);

    // 2. Delete the answer
    await databases.deleteDocument(db, answerCollection, answerId);

    // 3. Reduce author reputation
    const prefs = await users.getPrefs<UserPref>(answer.authorId);
    await users.updatePrefs(answer.authorId, {
      reputation: Math.max(0, Number(prefs.reputation || 0) - 1),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error deleting answer" },
      { status: error?.status || error?.code || 500 }
    );
  }
}
