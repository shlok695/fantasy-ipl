import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || "super_secret_fantasy_ipl_key_2026"
});

export const config = {
  matcher: ["/auction", "/admin/points"]
};
