"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NewsNetBoard, NewsNetFeedPost } from "@/lib/newsnet";
import { Button } from "@/components/ui/button";

import { PostRow } from "./PostRow";
import { useNewsNetApi } from "./useNewsNetApi";

interface PostFeedProps {
  board: NewsNetBoard;
  /** Posts the parent has appended optimistically (e.g. after a fresh compose) */
  prependedPosts?: NewsNetFeedPost[];
}

/**
 * Feed of posts for the active board. Refetches when `board` changes.
 * The parent passes `prependedPosts` so a freshly-composed post can appear
 * instantly without a refetch.
 */
export function PostFeed({ board, prependedPosts = [] }: PostFeedProps) {
  const { fetchPosts } = useNewsNetApi();
  const [posts, setPosts] = useState<NewsNetFeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  // Initial load + refetch on board change. Uses a request seq so a stale
  // response from a previous board doesn't clobber the current one.
  useEffect(() => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    setPosts([]);
    setCursor(null);
    fetchPosts(board, null)
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        setPosts(res.posts);
        setCursor(res.next_cursor);
      })
      .catch((err: Error) => {
        if (seq !== requestSeqRef.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (seq !== requestSeqRef.current) return;
        setLoading(false);
      });
  }, [board, fetchPosts]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetchPosts(board, cursor);
      setPosts((prev) => [...prev, ...res.posts]);
      setCursor(res.next_cursor);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [board, cursor, loading, fetchPosts]);

  // Filter prepended posts to the current board (defensive) and dedupe by id
  // against the fetched list (in case a refetch returned what we already showed).
  const dedupedPrepended = prependedPosts.filter(
    (p) => p.board === board && !posts.some((existing) => existing.id === p.id)
  );
  const combined = [...dedupedPrepended, ...posts];

  if (loading && combined.length === 0) {
    return (
      <div className="px-4 py-6 font-mono text-sm italic text-stone-400">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 font-mono text-sm text-red-300">
        Failed to load posts: {error}
      </div>
    );
  }

  if (combined.length === 0) {
    return (
      <div className="px-4 py-6 font-mono text-sm italic text-stone-400">
        No posts yet.
      </div>
    );
  }

  return (
    <div>
      {combined.map((post) => (
        <PostRow key={post.id} post={post} />
      ))}
      {cursor ? (
        <div className="border-t border-amber-900/20 px-4 py-3 text-center">
          <Button variant="ghost" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
