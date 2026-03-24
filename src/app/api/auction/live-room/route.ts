import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLiveRoomVisible, setLiveRoomVisible } from '@/lib/liveRoomVisibility';
import { recordAdminAudit } from '@/lib/adminAudit';

export async function GET() {
  try {
    return NextResponse.json({ visible: await getLiveRoomVisible() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (session?.user?.name !== 'admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { visible } = await request.json();
    const nextVisible = await setLiveRoomVisible(Boolean(visible));
    await recordAdminAudit(session.user!.name || 'admin', 'LIVE_ROOM_TOGGLE', nextVisible ? 'visible:on' : 'visible:off');
    return NextResponse.json({ success: true, visible: nextVisible });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
