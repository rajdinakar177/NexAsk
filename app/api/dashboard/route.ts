import { databases } from "@/app/models/server/config";
import {
    db,
    questionsCollection,
    answerCollection,
    voteCollection,
} from "@/app/models/name";
import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";

async function getVoteScore(type: "question" | "answer", typeId: string) {
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
    return up.total - down.total;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    try {
        // Fetch questions, answers, votes in parallel
        const [questionsRes, answersRes, votesRes] = await Promise.all([
            databases.listDocuments(db, questionsCollection, [
                Query.equal("authorId", userId),
                Query.orderDesc("$createdAt"),
                Query.limit(50),
            ]),
            databases.listDocuments(db, answerCollection, [
                Query.equal("authorId", userId),
                Query.orderDesc("$createdAt"),
                Query.limit(50),
            ]),
            databases.listDocuments(db, voteCollection, [
                Query.equal("votedById", userId),
                Query.orderDesc("$createdAt"),
                Query.limit(100),
            ]),
        ]);

        // Enrich questions with answer counts and vote scores
        const questions = await Promise.all(
            questionsRes.documents.map(async (q) => {
                const [answersCount, totalVotes] = await Promise.all([
                    databases.listDocuments(db, answerCollection, [
                        Query.equal("questionId", q.$id),
                        Query.limit(1),
                    ]),
                    getVoteScore("question", q.$id),
                ]);
                return {
                    $id: q.$id,
                    $createdAt: q.$createdAt,
                    title: q.title as string,
                    tags: (q.tags as string[]) ?? [],
                    totalAnswers: answersCount.total,
                    totalVotes,
                };
            })
        );

        // Enrich answers with question title and vote scores
        const answers = await Promise.all(
            answersRes.documents.map(async (a) => {
                const [question, totalVotes] = await Promise.all([
                    databases
                        .getDocument(db, questionsCollection, a.questionId as string)
                        .catch(() => null),
                    getVoteScore("answer", a.$id),
                ]);
                return {
                    $id: a.$id,
                    $createdAt: a.$createdAt,
                    content: a.content as string,
                    questionId: a.questionId as string,
                    questionTitle: (question?.title as string) ?? "Deleted question",
                    totalVotes,
                };
            })
        );

        // Enrich votes with target title
        const votes = await Promise.all(
            votesRes.documents.map(async (v) => {
                let targetTitle = "";
                try {
                    const collection =
                        v.type === "question" ? questionsCollection : answerCollection;
                    const doc = await databases.getDocument(db, collection, v.typeId as string);
                    targetTitle =
                        v.type === "question"
                            ? (doc.title as string)
                            : (doc.content as string).replace(/[#*`_~>]/g, "").trim().slice(0, 80);
                } catch {
                    targetTitle = "Deleted content";
                }
                return {
                    $id: v.$id,
                    $createdAt: v.$createdAt,
                    type: v.type as string,
                    typeId: v.typeId as string,
                    voteStatus: v.voteStatus as string,
                    targetTitle,
                };
            })
        );

        return NextResponse.json({ questions, answers, votes });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message ?? "Failed to load dashboard" },
            { status: 500 }
        );
    }
}