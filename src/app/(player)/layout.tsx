"use client";

import { AuthGate } from "@/ui/components/AuthGate";
import { SessionProvider } from "@/contexts/SessionContext";
import { PlayerNav } from "@/components/nav/PlayerNav";
import { QueryProvider } from "@/providers/QueryProvider";
import { ClientErrorBoundary } from "@/components/ux/ClientErrorBoundary";
import { EarlyBuildBanner } from "@/components/ux/EarlyBuildBanner";

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
            <div className="vhs-overlay min-h-screen">
              <PlayerNav />
              <EarlyBuildBanner />
              <main className="segment-tinted min-h-[calc(100vh-3rem)]">
                <ClientErrorBoundary>{children}</ClientErrorBoundary>
              </main>
            </div>
          </SessionProvider>
        </QueryProvider>
      )}
    </AuthGate>
  );
}
