import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SAFE_MATCH_ID = /^[a-zA-Z0-9_-]+$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.name !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await context.params;
  if (!matchId || !SAFE_MATCH_ID.test(matchId)) {
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "docs",
    `match-${matchId}-calculations.md`
  );

  try {
    const body = await readFile(filePath, "utf8");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Calculation log not found. Generate with: node scripts/generate-match-calculations.js " +
          matchId,
      },
      { status: 404 }
    );
  }
}
