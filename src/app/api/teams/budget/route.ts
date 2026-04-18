import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAdminAudit } from '@/lib/adminAudit';
import { getErrorMessage } from '@/lib/errorMessage';

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
    const team = await prisma.user.update({
      where: { id: teamId },
      data: { budget: newBudget }
    });
    await recordAdminAudit(session.user!.name || 'admin', 'TEAM_BUDGET_EDIT', `${team.name} budget:${newBudget}`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
