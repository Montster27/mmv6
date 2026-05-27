"use client";

import type { NewsNetFeedPost } from "@/lib/newsnet";

interface PostRowProps {
  post: NewsNetFeedPost;
}

/**
 * One post in the feed. Renders identically regardless of `source` —
 * the ambiguity between player and NPC posts is the design.
 */
export function PostRow({ post }: PostRowProps) {
  return (
    <article className="border-b border-amber-900/20 px-4 py-3 last:border-b-0">
      <header className="mb-2 flex items-baseline justify-between font-mono text-xs">
        <span className="font-semibold text-amber-200">{post.handle}</span>
        <span className="text-stone-400">Day {post.in_game_day}</span>
      </header>
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-stone-100">
        {post.body}
      </pre>
    </article>
  );
}
