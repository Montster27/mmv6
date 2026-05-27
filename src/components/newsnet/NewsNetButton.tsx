"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { NewsNetModal } from "./NewsNetModal";

/**
 * Single-import drop-in for `play/page.tsx`. Owns the open/close state for
 * the NewsNet modal so the host page doesn't need to wire anything.
 */
export function NewsNetButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        NewsNet
      </Button>
      <NewsNetModal open={open} onOpenChange={setOpen} />
    </>
  );
}
