import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getErrorMessage } from '@/lib/errorMessage';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionUserId } from '@/lib/sessionUser';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { newName } = await request.json();
    
    if (!newName || newName.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }

    // Check if name is taken
    const existing = await prisma.user.findUnique({
      where: { name: newName.trim() }
    });

    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "Name already taken" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name: newName.trim() }
    });

    return NextResponse.json({ success: true, name: newName.trim() });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
