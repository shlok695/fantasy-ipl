import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // We define "remaining" as players who have not been assigned to a user/franchise yet
    const remainingPlayers = await prisma.player.findMany({
      where: {
        userId: null,
      },
      select: {
        role: true,
        country: true,
      }
    });

    const stats = {
      roles: {
        Batter: 0,
        Bowler: 0,
        'All-Rounder': 0,
        Wicketkeeper: 0,
      },
      countries: {} as Record<string, number>,
      totalRemaining: remainingPlayers.length,
    };

    remainingPlayers.forEach(p => {
      if (p.role) {
        const r = p.role.toLowerCase();
        if (r.includes('batter')) stats.roles.Batter++;
        else if (r.includes('bowler')) stats.roles.Bowler++;
        else if (r.includes('all-rounder')) stats.roles['All-Rounder']++;
        else if (r.includes('wicketkeeper')) stats.roles.Wicketkeeper++;
      }

      if (p.country) {
        stats.countries[p.country] = (stats.countries[p.country] || 0) + 1;
      }
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching auction stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
