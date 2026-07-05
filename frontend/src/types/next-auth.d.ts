import "next-auth";

// Extend NextAuth's built-in types so TypeScript knows about our custom fields
declare module "next-auth" {
  interface Session {
    accessToken: string;
    error?: string;
    user: {
      id: string;
      name: string;
      image: string;
      email?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    userId?: string;
    username?: string;
    avatarUrl?: string;
  }
}
