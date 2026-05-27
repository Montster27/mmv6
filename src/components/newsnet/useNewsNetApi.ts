"use client";

import { useCallback } from "react";

import { supabase } from "@/lib/supabase/browser";
import type {
  MergeFeedResult,
  NewsNetBoard,
  NewsNetFeedPost,
} from "@/lib/newsnet";

// ─────────────────────────────────────────────────────────────────────
// useNewsNetApi — thin client hook around the /api/newsnet/* routes.
//
// All requests carry the current Supabase session as a Bearer token. The
// pattern matches the existing client-side fetches in play/page.tsx and
// the (player)/group pages.
// ─────────────────────────────────────────────────────────────────────

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; detail?: string };
    return body.detail ?? body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export interface HandleResponse {
  handle: string | null;
}

export interface SetHandleErrorKind {
  kind: "invalid" | "reserved" | "taken" | "already_set" | "network";
  detail: string;
  existing?: string; // for already_set
}

export interface PostsResponse extends MergeFeedResult {}

export function useNewsNetApi() {
  const fetchHandle = useCallback(async (): Promise<HandleResponse> => {
    const headers = await authHeaders();
    const res = await fetch("/api/newsnet/handle", { headers });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
  }, []);

  const setHandle = useCallback(
    async (handle: string): Promise<{ handle: string } | SetHandleErrorKind> => {
      const headers = await authHeaders();
      const res = await fetch("/api/newsnet/handle", {
        method: "POST",
        headers,
        body: JSON.stringify({ handle }),
      });
      if (res.ok) {
        return res.json();
      }
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
        handle?: string;
      };
      const detail = body.detail ?? body.error ?? `HTTP ${res.status}`;
      const error = body.error;
      if (error === "handle_invalid") return { kind: "invalid", detail };
      if (error === "handle_reserved") return { kind: "reserved", detail };
      if (error === "handle_taken") return { kind: "taken", detail };
      if (error === "handle_already_set") {
        return { kind: "already_set", detail, existing: body.handle };
      }
      return { kind: "network", detail };
    },
    []
  );

  const fetchPosts = useCallback(
    async (
      board: NewsNetBoard,
      cursor?: string | null,
      limit = 50
    ): Promise<PostsResponse> => {
      const headers = await authHeaders();
      const params = new URLSearchParams({ board, limit: String(limit) });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/newsnet/posts?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    []
  );

  const createPost = useCallback(
    async (board: NewsNetBoard, body: string): Promise<NewsNetFeedPost> => {
      const headers = await authHeaders();
      const res = await fetch("/api/newsnet/posts", {
        method: "POST",
        headers,
        body: JSON.stringify({ board, body }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    []
  );

  return { fetchHandle, setHandle, fetchPosts, createPost };
}
