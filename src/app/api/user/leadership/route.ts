import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { captainId, viceCaptainId } = await request.json();
    const userId = (session.user as any).id;

    if (!captainId || !viceCaptainId) {
      return NextResponse.json({ error: "Captain and vice-captain are required" }, { status: 400 });
    }

    if (captainId === viceCaptainId) {
      return NextResponse.json({ error: "Captain and vice-captain must be different players" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { captainId: true, viceCaptainId: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.captainId || user.viceCaptainId) {
      return NextResponse.json({ error: "Captain and vice-captain are already locked for this league" }, { status: 400 });
    }

    const players = await prisma.player.findMany({
      where: {
        id: { in: [captainId, viceCaptainId] },
        userId
      },
      select: { id: true, name: true }
    });

    if (players.length !== 2) {
      return NextResponse.json({ error: "Both selections must belong to your team" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        captainId,
        viceCaptainId
      },
      include: {
        captain: { select: { id: true, name: true } },
        viceCaptain: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({
      success: true,
      captain: updatedUser.captain,
      viceCaptain: updatedUser.viceCaptain
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
