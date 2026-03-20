import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user?.name !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, newBudget } = await request.json();

  if (!teamId || typeof newBudget !== 'number') {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: teamId },
      data: { budget: newBudget }
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
