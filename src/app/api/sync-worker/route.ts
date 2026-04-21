import { NextResponse } from "next/server";
import { maybeAutoSyncConfiguredMatch } from "@/lib/matchSync";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log({
      event: "match_sync_entrypoint_called",
      source: "worker",
      matchId: null,
      scheduledTime: null,
      actualTime: new Date().toISOString(),
    });

    const status = await maybeAutoSyncConfiguredMatch({ source: "worker" });
    return NextResponse.json({ success: true, status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
