import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

const ALLOWED_EMAILS = [
  "thiago.anjo@gmail.com",
  "jackeline.queiroz@gmail.com",
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      from: "Financas Pessoais <noreply@resend.dev>",
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return ALLOWED_EMAILS.includes(user.email.toLowerCase());
    },
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
