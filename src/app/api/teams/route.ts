import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { getErrorMessage } from '@/lib/errorMessage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (process.env.AUTO_SYNC_ALLOW_PASSIVE_API_TRIGGERS === "true") {
      try {
        const { maybeAutoSyncConfiguredMatch } = await import('@/lib/matchSync');
        await maybeAutoSyncConfiguredMatch({ source: "teams" });
      } catch (syncError) {
        console.error("Auto-sync skipped after failure in /api/teams", syncError);
      }
    }

    const users = await prisma.user.findMany({
      where: {
        name: { not: 'admin' }
      },
      include: {
        captain: {
          select: { id: true, name: true }
        },
        viceCaptain: {
          select: { id: true, name: true }
        },
        players: {
          where: {
            role: { not: 'IPL TEAM' }
          },
          include: {
            points: {
              include: {
                match: true,
              },
              orderBy: [
                { matchId: 'desc' },
                { createdAt: 'desc' },
              ],
            }
          }
        }
      },
      orderBy: [
        { totalPoints: 'desc' },
        { name: 'asc' }
      ]
    });
    return NextResponse.json(users, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, budget, password } = await request.json();
    if (!name || !password) return NextResponse.json({ error: "Name and password are required" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newTeam = await prisma.user.create({
      data: {
        name,
        password: hashedPassword,
        budget: typeof budget === 'number' ? budget : 125.0,
      }
    });

    return NextResponse.json(newTeam);
  } catch (error: unknown) {
    if ((error as Prisma.PrismaClientKnownRequestError)?.code === 'P2002') {
      return NextResponse.json({ error: "Team name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
