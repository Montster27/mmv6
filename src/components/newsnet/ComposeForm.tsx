"use client";

import { useState } from "react";

import {
  POST_BODY_MAX,
  POST_BODY_MIN,
  type NewsNetBoard,
  type NewsNetFeedPost,
} from "@/lib/newsnet";
import { Button } from "@/components/ui/button";

import { useNewsNetApi } from "./useNewsNetApi";

interface ComposeFormProps {
  board: NewsNetBoard;
  handle: string;
  onPosted: (post: NewsNetFeedPost) => void;
}

const COUNTER_VISIBLE_THRESHOLD = 800;

/**
 * Post composer for the active board. Always visible (per spec) — failure
 * states show inline. No drafts persisted across sessions.
 */
export function ComposeForm({ board, handle, onPosted }: ComposeFormProps) {
  const { createPost } = useNewsNetApi();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedLength = body.length;
  const tooLong = trimmedLength > POST_BODY_MAX;
  const isEmpty = trimmedLength < POST_BODY_MIN;
  const canSubmit = !submitting && !tooLong && !isEmpty;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const post = await createPost(board, body);
      onPosted(post);
      setBody("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-b border-amber-900/30 bg-stone-950/40 p-3">
      <div className="mb-2 flex items-center justify-between font-mono text-xs text-stone-400">
        <span>
          From: <span className="text-amber-200">{handle}</span> · Newsgroup:{" "}
          <span className="text-amber-200">{board}</span>
        </span>
        {trimmedLength >= COUNTER_VISIBLE_THRESHOLD ? (
          <span className={tooLong ? "text-red-300" : "text-amber-200"}>
            {trimmedLength} / {POST_BODY_MAX}
          </span>
        ) : null}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type a message…"
        rows={4}
        maxLength={POST_BODY_MAX + 100 /* allow brief overflow before counter blocks */}
        className="block w-full resize-y rounded border border-amber-900/30 bg-stone-900 px-2 py-2 font-mono text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-h-[1.25rem] flex-1 font-mono text-xs text-red-300">
          {error ?? (tooLong ? `Too long by ${trimmedLength - POST_BODY_MAX}` : "")}
        </div>
        <Button onClick={handleSubmit} disabled={!canSubmit} size="sm">
          {submitting ? "Posting…" : "Post"}
        </Button>
      </div>
    </div>
  );
}
