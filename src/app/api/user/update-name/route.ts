import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!(session?.user as any)?.id) {
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

    if (existing && session.user && existing.id !== (session.user as any).id) {
      return NextResponse.json({ error: "Name already taken" }, { status: 400 });
    }

    if (session.user) {
      await prisma.user.update({
        where: { id: (session.user as any).id },
        data: { name: newName.trim() }
      });
    }

    return NextResponse.json({ success: true, name: newName.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
