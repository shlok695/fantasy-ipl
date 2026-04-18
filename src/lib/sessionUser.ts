import type { Session } from "next-auth";

export function getSessionUserId(session: Session | null) {
  return session?.user?.id ?? null;
}
