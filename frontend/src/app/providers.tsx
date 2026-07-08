"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { useEffect } from "react";

function SessionRefresher({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    // If the 7-day refresh token expires or fails, NextAuth tags the session with this error.
    // This instantly destroys the local cookie and redirects them back to login.
    if ((session as any)?.error === "RefreshAccessTokenError") {
      signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={14 * 60}>
      <SessionRefresher>
        {children}
      </SessionRefresher>
    </SessionProvider>
  );
}
