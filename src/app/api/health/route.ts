import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Liveness + DB check for the svps blackbox probe (local and public /ipl/api/health).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
