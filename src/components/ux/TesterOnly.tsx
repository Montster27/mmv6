"use client";

import type { ReactNode } from "react";
import { getAppMode } from "@/lib/mode";

type Props = {
  children: ReactNode;
};

export function TesterOnly({ children }: Props) {
  const { testerMode } = getAppMode();
  if (!testerMode) return null;
  return <>{children}</>;
}
