import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getErrorMessage } from '@/lib/errorMessage';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSessionUserId } from '@/lib/sessionUser';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { oldPassword, newPassword, confirmPassword } = await request.json();

    if (!oldPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: "New password must be at least 4 characters" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New password and confirm password do not match" }, { status: 400 });
    }

    if (oldPassword === newPassword) {
      return NextResponse.json({ error: "New password must be different from old password" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const matches = await bcrypt.compare(oldPassword, user.password);
    if (!matches) {
      return NextResponse.json({ error: "Old password is incorrect" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
