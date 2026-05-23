import { commentCollection, db } from "@/app/models/name";
import { databases } from "@/app/models/server/config";
import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";

// ── POST /api/comment ─────────────────────────────────────────────────────────
// Body: { content, type: "question"|"answer", typeId, authorId }
export async function POST(request: NextRequest) {
  try {
    const { content, type, typeId, authorId } = await request.json();

    // Validate
    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }
    if (content.trim().length < 5) {
      return NextResponse.json(
        { error: "Comment must be at least 5 characters" },
        { status: 400 }
      );
    }
    if (content.trim().length > 10000) {
      return NextResponse.json(
        { error: "Comment exceeds maximum length" },
        { status: 400 }
      );
    }
    if (!type || !["question", "answer"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'question' or 'answer'" },
        { status: 400 }
      );
    }
    if (!typeId) {
      return NextResponse.json(
        { error: "typeId is required" },
        { status: 400 }
      );
    }
    if (!authorId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const comment = await databases.createDocument(
      db,
      commentCollection,
      ID.unique(),
      {
        content: content.trim(),
        type,
        typeId,
        authorId,
      }
    );

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error creating comment" },
      { status: error?.status || error?.code || 500 }
    );
  }
}

// ── DELETE /api/comment ───────────────────────────────────────────────────────
// Body: { commentId, authorId }
// Only the comment's own author can delete it.
export async function DELETE(request: NextRequest) {
  try {
    const { commentId, authorId } = await request.json();

    if (!commentId) {
      return NextResponse.json(
        { error: "commentId is required" },
        { status: 400 }
      );
    }
    if (!authorId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch comment to verify ownership
    const comment = await databases.getDocument(db, commentCollection, commentId);

    if (comment.authorId !== authorId) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    await databases.deleteDocument(db, commentCollection, commentId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error deleting comment" },
      { status: error?.status || error?.code || 500 }
    );
  }
}
