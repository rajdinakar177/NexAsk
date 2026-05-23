import {
    answerCollection,
    db,
    questionsCollection,
    voteCollection,
} from "@/app/models/name";

import { databases, users } from "@/app/models/server/config";

import { NextRequest, NextResponse } from "next/server";

import { ID, Query } from "node-appwrite";
import { UserPref } from "@/app/store/Auth"

export async function POST(request: NextRequest) {
    try {
        const { voteStatus, votedById, type, typeId } =
            await request.json();

        // existing vote
        const existingVote = await databases.listDocuments(
            db,
            voteCollection,
            [
                Query.equal("type", type),
                Query.equal("typeId", typeId),
                Query.equal("votedById", votedById),
                Query.limit(1),
            ]
        );

        const existing = existingVote.documents[0];

        // get question or answer
        const QuestionOrAnswer = await databases.getDocument(
            db,
            type === "question"
                ? questionsCollection
                : answerCollection,
            typeId
        );

        const authorId = QuestionOrAnswer.authorId;

        let reputationChange = 0;

        // SAME VOTE -> REMOVE VOTE
        if (existing && existing.voteStatus === voteStatus) {
            await databases.deleteDocument(
                db,
                voteCollection,
                existing.$id
            );

            reputationChange =
                voteStatus === "upvoted" ? -1 : +1;
        }

        // CHANGE VOTE
        else if (existing) {
            await databases.updateDocument(
                db,
                voteCollection,
                existing.$id,
                {
                    voteStatus,
                }
            );

            if (voteStatus === "upvoted") {
                reputationChange = +2;
            } else {
                reputationChange = -2;
            }
        }

        // NEW VOTE
        else {
            await databases.createDocument(
                db,
                voteCollection,
                ID.unique(),
                {
                    voteStatus,
                    votedById,
                    type,
                    typeId,
                }
            );

            reputationChange =
                voteStatus === "upvoted" ? +1 : -1;
        }

        // update reputation
        const prefs = await users.getPrefs<UserPref>(authorId);

        await users.updatePrefs(authorId, {
            reputation: Math.max(
                0,
                Number(prefs.reputation || 0) + reputationChange
            ),
        });

        // total votes
    const [upvotes, downvotes] = await Promise.all([
  databases.listDocuments(db, voteCollection, [
    Query.equal("type", type),
    Query.equal("typeId", typeId),
    Query.equal("voteStatus", "upvoted"),
    Query.limit(1),   // ← we only need .total, not the docs
  ]),
  databases.listDocuments(db, voteCollection, [
    Query.equal("type", type),
    Query.equal("typeId", typeId),
    Query.equal("voteStatus", "downvoted"),
    Query.limit(1),   // ← same
  ]),
]);

        return NextResponse.json(
            {
                data: {
                    upvotes: upvotes.total,
                    downvotes: downvotes.total,
                    score: upvotes.total - downvotes.total,
                },
                message: "Vote handled successfully",
            },
            {
                status: 200,
            }
        );
    } catch (error: any) {
        return NextResponse.json(
            {
                error:
                    error?.message ||
                    "Error while creating vote",
            },
            {
                status:
                    error?.status ||
                    error?.code ||
                    500,
            }
        );
    }
}