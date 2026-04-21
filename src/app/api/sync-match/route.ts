import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { startMatchSyncRun } from "@/lib/matchSync";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.name !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId } = await request.json();
    if (!matchId) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    console.log({
      event: "match_sync_entrypoint_called",
      source: "manual",
      matchId: String(matchId),
      scheduledTime: null,
      actualTime: new Date().toISOString(),
    });

    const syncRun = startMatchSyncRun(String(matchId), {
      name: session.user!.name || "admin",
    }, {
      source: "manual",
      scheduledTime: null,
      triggerStatus: "started",
    });

    if (syncRun.status === "in-progress") {
      return NextResponse.json(
        { error: "Sync already running for this match", status: "in-progress" },
        { status: 409 }
      );
    }

    const result = await syncRun.promise;

    return NextResponse.json(result);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
