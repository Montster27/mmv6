"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function GameOnly({ children }: Props) {
  return <>{children}</>;
}
