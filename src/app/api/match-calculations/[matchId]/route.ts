import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SAFE_MATCH_ID = /^[a-zA-Z0-9_-]+$/;

function safeParseJson<T>(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function buildStoredCalculationMarkdown(matchId: string, payload: {
  match: {
    displayId?: string | null;
    shortTitle?: string | null;
    title?: string | null;
    season?: string | null;
    status?: string | null;
    source?: string | null;
    startedAt?: Date | string | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  } | null;
  rows: Array<{
    points: number;
    source?: string | null;
    scoreVersion?: string | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    breakdownJson?: string | null;
    statsJson?: string | null;
    player: {
      name: string;
      role?: string | null;
      iplTeam?: string | null;
      user?: { name?: string | null } | null;
    };
  }>;
}) {
  const matchLabel =
    payload.match?.title?.trim() ||
    payload.match?.shortTitle?.trim() ||
    payload.match?.displayId?.trim() ||
    matchId;

  const lines: string[] = [
    `# Match ${matchId} Stored Calculations`,
    "",
    "> Generated from synced PlayerPoints because a prebuilt markdown audit file was not found.",
    "",
    "## Match",
    "",
    `- Label: ${matchLabel}`,
    `- Display ID: ${payload.match?.displayId || "-"}`,
    `- Status: ${payload.match?.status || "-"}`,
    `- Season: ${payload.match?.season || "-"}`,
    `- Source: ${payload.match?.source || "-"}`,
    `- Started At: ${formatDateTime(payload.match?.startedAt) || "-"}`,
    `- Stored Rows: ${payload.rows.length}`,
    "",
    "## Players",
    "",
  ];

  for (const row of payload.rows) {
    const breakdown = safeParseJson<{
      lines?: Array<{ label?: string; value?: number }>;
      subtotal?: number;
      multiplierLabel?: string;
      multiplierValue?: number;
      finalPoints?: number;
    }>(row.breakdownJson);
    const stats = safeParseJson<Record<string, unknown>>(row.statsJson);

    lines.push(`### ${row.player.name} (${row.player.iplTeam || "-"}) — ${Math.round(row.points || 0)} pts`);
    lines.push("");
    lines.push(`- Owner: ${row.player.user?.name || "Unassigned"}`);
    lines.push(`- Role: ${row.player.role || "-"}`);
    lines.push(`- Source: ${row.source || "-"}`);
    lines.push(`- Score Version: ${row.scoreVersion || "-"}`);
    lines.push(`- Recorded At: ${formatDateTime(row.updatedAt || row.createdAt) || "-"}`);

    if (breakdown?.lines?.length) {
      lines.push("- Breakdown:");
      for (const breakdownLine of breakdown.lines) {
        lines.push(`  - ${breakdownLine.label || "Line"}: ${Number(breakdownLine.value || 0)}`);
      }
      if (typeof breakdown.subtotal === "number") {
        lines.push(`  - Subtotal: ${breakdown.subtotal}`);
      }
      if (typeof breakdown.multiplierValue === "number") {
        lines.push(
          `  - Multiplier: ${breakdown.multiplierLabel || "Normal"} x${breakdown.multiplierValue}`
        );
      }
      if (typeof breakdown.finalPoints === "number") {
        lines.push(`  - Final Points: ${breakdown.finalPoints}`);
      }
    }

    if (stats && Object.keys(stats).length > 0) {
      lines.push("- Stats:");
      for (const [key, value] of Object.entries(stats)) {
        lines.push(`  - ${key}: ${String(value)}`);
      }
    }

    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

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
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });
    const rows = await prisma.playerPoints.findMany({
      where: { matchId },
      include: {
        player: {
          select: {
            name: true,
            role: true,
            iplTeam: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { points: "desc" },
        { updatedAt: "desc" },
      ],
    });

    if (match && rows.length > 0) {
      const body = buildStoredCalculationMarkdown(matchId, { match, rows });
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": "private, max-age=60",
        },
      });
    }

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
