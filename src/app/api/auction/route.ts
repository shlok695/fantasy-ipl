import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordAdminAudit, recordAdminAuditWithDb } from '@/lib/adminAudit';
import { handleAuctionPost } from './auctionRouteCore';

export async function POST(request: Request) {
  return handleAuctionPost({
    getSession: () => getServerSession(authOptions),
    parseJson: () => request.json(),
    prisma: {
      $transaction: (callback) => prisma.$transaction((tx) => callback(tx as any)),
    },
    recordAdminAudit: (actor, action, details, tx) =>
      tx && typeof tx.$executeRawUnsafe === 'function'
        ? recordAdminAuditWithDb(tx as { $executeRawUnsafe: (query: string, ...values: any[]) => PromiseLike<unknown> }, actor, action, details)
        : recordAdminAudit(actor, action, details),
  });
}
