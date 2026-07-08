import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";



const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace("localhost", "127.0.0.1");

async function refreshAccessToken(token: any) {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
    });

    if (!res.ok) {
      throw new Error("RefreshTokenError");
    }

    const data = await res.json();

    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + 15 * 60 * 1000, // 15 mins
    };
  } catch (error) {
    console.error("Error refreshing access token", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // ─── GitHub OAuth Provider ───
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),

    // ─── Credentials (Email/Password) Provider ───
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
            }),
          });

          if (!res.ok) {
            console.error("Login failed with status:", res.status);
            return null;
          }

          const data = await res.json();

          return {
            id: data.user_id,
            name: data.username,
            image: data.avatar_url,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          };
        } catch (error) {
          console.error("Login fetch error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    // ─── JWT Callback ───
    async jwt({ token, user, account }) {
      // 1. Initial Sign In
      if (account && user) {
        // GitHub Login
        if (account.provider === "github" && account.access_token) {
          const res = await fetch(`${API_URL}/auth/github`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: account.access_token }),
          });

          if (!res.ok) {
            console.error("GitHub exchange failed with status:", res.status);
            throw new Error("GitHub token exchange failed");
          }

          const data = await res.json();
          token.accessToken = data.access_token;
          token.refreshToken = data.refresh_token;
          token.accessTokenExpires = Date.now() + 15 * 60 * 1000;
          token.userId = data.user_id;
          token.username = data.username;
          token.avatarUrl = data.avatar_url;
          return token;
        }

        // Credentials Login
        if (account.provider === "credentials") {
          token.accessToken = (user as any).accessToken;
          token.refreshToken = (user as any).refreshToken;
          token.accessTokenExpires = Date.now() + 15 * 60 * 1000;
          token.userId = user.id;
          token.username = user.name || undefined;
          token.avatarUrl = user.image || undefined;
          return token;
        }
      }

      // 2. Subsequent check: Return previous token if the access token has not expired yet
      // Subtract 2 minutes (120000 ms) from expiry time to act as a buffer.
      // This ensures that when our 14-minute refetchInterval triggers, the token (with 1 min left) is refreshed.
      if (Date.now() < (token.accessTokenExpires as number) - (2 * 60 * 1000)) {
        return token;
      }

      // 3. Access token has expired, try to update it
      return await refreshAccessToken(token);
    },

    // ─── Session Callback ───
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      session.user = {
        ...session.user,
        id: token.userId as string,
        name: token.username as string,
        image: token.avatarUrl as string,
      };
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
