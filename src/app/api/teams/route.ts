import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        name: { not: 'admin' }
      },
      include: {
        players: {
          include: {
            points: true
          }
        }
      },
      orderBy: [
        { totalPoints: 'desc' },
        { name: 'asc' }
      ]
    });
    return NextResponse.json(users);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
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
        budget: typeof budget === 'number' ? budget : 100.0,
      }
    });

    return NextResponse.json(newTeam);
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ error: "Team name already exists" }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
