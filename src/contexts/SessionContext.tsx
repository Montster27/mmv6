"use client";

import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

type SessionContextValue = {
  session: Session;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ session }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx.session;
}
