"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NEWSNET_BOARDS,
  type NewsNetBoard,
  type NewsNetFeedPost,
} from "@/lib/newsnet";

import { BoardTabs } from "./BoardTabs";
import { ComposeForm } from "./ComposeForm";
import { HandleSetupModal } from "./HandleSetupModal";
import { PostFeed } from "./PostFeed";
import { useNewsNetApi } from "./useNewsNetApi";

interface NewsNetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HandleState =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "set"; handle: string }
  | { kind: "error"; detail: string };

/**
 * NewsNet — the async board UI. Modal-scoped: opening fetches the player's
 * handle once; if absent, the HandleSetupModal blocks the board view until
 * the handle is set.
 */
export function NewsNetModal({ open, onOpenChange }: NewsNetModalProps) {
  const { fetchHandle } = useNewsNetApi();
  const [activeBoard, setActiveBoard] = useState<NewsNetBoard>(NEWSNET_BOARDS[0]);
  const [handleState, setHandleState] = useState<HandleState>({ kind: "loading" });
  const [prependedPosts, setPrependedPosts] = useState<NewsNetFeedPost[]>([]);

  // Load handle when the modal opens; reset prepended posts when it closes.
  //
  // IMPORTANT: do NOT include handleState.kind in the deps. Earlier versions
  // did, with a `kind === "set"` early-exit to skip refetches. That created
  // an infinite loop on the "missing" path: the effect wrote kind → "loading"
  // → fetched → wrote kind → "missing" → kind dep changed → effect re-fired →
  // kind → "loading" again → loop. User saw rapid HandleSetupModal/loading
  // flicker and couldn't interact.
  //
  // Fix per the React best-practices `rerender-move-effect-to-event` rule:
  // the fetch is triggered by the OPEN transition, not by state derived from
  // it. Refetching on every open is cheap (one indexed SELECT per modal-open)
  // and avoids closure-staleness.
  useEffect(() => {
    if (!open) {
      setPrependedPosts([]);
      return;
    }
    let cancelled = false;
    setHandleState({ kind: "loading" });
    fetchHandle()
      .then((res) => {
        if (cancelled) return;
        setHandleState(
          res.handle ? { kind: "set", handle: res.handle } : { kind: "missing" }
        );
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setHandleState({ kind: "error", detail: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [open, fetchHandle]);

  function handleHandleSet(handle: string) {
    setHandleState({ kind: "set", handle });
  }

  function handlePosted(post: NewsNetFeedPost) {
    // Optimistically push the new post into the feed.
    setPrependedPosts((prev) => [post, ...prev]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[80vh] max-h-[80vh] w-[92vw] max-w-3xl flex-col overflow-hidden border-amber-900/40 bg-stone-950 p-0 text-stone-100"
      >
        <DialogHeader className="border-b border-amber-900/30 bg-stone-900/60 px-4 py-2">
          <DialogTitle className="font-mono text-base tracking-wider text-amber-200">
            NewsNet — ARPANET news
          </DialogTitle>
        </DialogHeader>

        {handleState.kind === "loading" ? (
          <div className="flex-1 px-4 py-6 font-mono text-sm italic text-stone-400">
            Connecting…
          </div>
        ) : handleState.kind === "error" ? (
          <div className="flex-1 px-4 py-6 font-mono text-sm text-red-300">
            Connection failed: {handleState.detail}
          </div>
        ) : handleState.kind === "missing" ? (
          <HandleSetupModal onHandleSet={handleHandleSet} />
        ) : (
          <>
            <BoardTabs active={activeBoard} onChange={setActiveBoard} />
            <ComposeForm
              board={activeBoard}
              handle={handleState.handle}
              onPosted={handlePosted}
            />
            <div className="flex-1 overflow-y-auto">
              <PostFeed board={activeBoard} prependedPosts={prependedPosts} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
