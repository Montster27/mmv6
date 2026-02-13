"use client";

import { AuthGate } from "@/ui/components/AuthGate";
import { SessionProvider } from "@/contexts/SessionContext";
import { PlayerNav } from "@/components/nav/PlayerNav";
import { QueryProvider } from "@/providers/QueryProvider";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      {(session) => (
        <QueryProvider>
          <SessionProvider session={session}>
            <PlayerNav />
            <main>{children}</main>
          </SessionProvider>
        </QueryProvider>
      )}
    </AuthGate>
  );
}
