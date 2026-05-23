import { NextRequest, NextResponse } from "next/server";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // optional — add to .env.local for higher rate limits
const USERNAME = "rajdinakar177"; // ← change to your GitHub username

function githubHeaders() {
    const headers: Record<string, string> = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Riverflow-App",
    };
    if (GITHUB_TOKEN) {
        headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
    }
    return headers;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "user" | "repos"

    try {
        if (type === "user") {
            const res = await fetch(`https://api.github.com/users/${USERNAME}`, {
                headers: githubHeaders(),
                next: { revalidate: 3600 }, // cache 1 hour
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "GitHub API error");
            return NextResponse.json(data);
        }

        if (type === "repos") {
            const res = await fetch(
                `https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`,
                {
                    headers: githubHeaders(),
                    next: { revalidate: 3600 },
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.message ?? "GitHub API error");
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message ?? "Failed to fetch GitHub data" },
            { status: 500 }
        );
    }
}