import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { getEnv } from "@/server/env";

const env = getEnv();

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user && token?.sub) (session.user as { id?: string }).id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: env.NEXTAUTH_SECRET,
  trustHost: true,
};

export default NextAuth(authOptions);

export function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}
