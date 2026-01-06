"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabaseClient";

type AuthGateProps = {
  children: (session: Session) => React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) {
        console.error("Failed to fetch session", error);
        setSession(null);
      } else {
        setSession(data.session);
        if (!data.session) {
          router.replace("/login");
        }
      }
      setChecked(true);
    };

    syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        if (!newSession) {
          router.replace("/login");
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, [router]);

  if (!checked) {
    return null;
  }

  if (!session) {
    return null;
  }

  return <>{children(session)}</>;
}
