import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getErrorMessage } from '@/lib/errorMessage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'unsold' or 'sold' or all
  const q = searchParams.get('q'); // search name

  const whereClause: Prisma.PlayerWhereInput = {};

  if (status === 'upcoming') {
    whereClause.userId = null;
    whereClause.AND = [
      { NOT: { acquisition: 'External' } },
      {
        OR: [
          { acquisition: null },
          { acquisition: { not: 'Unsold' } }
        ],
      },
    ];
  } else if (status === 'passed') {
    whereClause.userId = null;
    whereClause.acquisition = 'Unsold';
  } else if (status === 'sold') {
    whereClause.userId = { not: null };
  }

  if (q) {
    whereClause.name = { contains: q }; // sqlite contains uses ILIKE essentially
  }

  try {
    const players = await prisma.player.findMany({
      where: whereClause,
      include: {
        user: true,
        points: {
          include: {
            match: true,
          },
          orderBy: [
            { matchId: 'desc' },
            { createdAt: 'desc' },
          ],
        },
      },
      orderBy: { number: 'asc' },
    });
    return NextResponse.json(players);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
