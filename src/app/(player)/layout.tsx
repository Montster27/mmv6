"use client";

import { AuthGate } from "@/ui/components/AuthGate";
import { SessionProvider } from "@/contexts/SessionContext";
import { PlayerNav } from "@/components/nav/PlayerNav";
import { QueryProvider } from "@/providers/QueryProvider";
import { ClientErrorBoundary } from "@/components/ux/ClientErrorBoundary";

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
            <main>
              <ClientErrorBoundary>{children}</ClientErrorBoundary>
            </main>
          </SessionProvider>
        </QueryProvider>
      )}
    </AuthGate>
  );
}
