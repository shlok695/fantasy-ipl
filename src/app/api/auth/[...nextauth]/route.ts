import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

const wrappedHandler = async (req: any, ctx: any) => {
  console.log(`[AUTH] Request URL: ${req.url}`);
  return handler(req, ctx);
};

export { wrappedHandler as GET, wrappedHandler as POST };
