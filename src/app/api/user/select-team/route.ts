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
    const { iplTeam } = await request.json();
    
    if (!iplTeam) {
      return NextResponse.json({ error: "No team selected" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user?.iplTeam) {
      return NextResponse.json({ error: "You have already selected an IPL team." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { iplTeam }
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
