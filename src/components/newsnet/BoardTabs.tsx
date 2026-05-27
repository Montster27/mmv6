"use client";

import { cn } from "@/lib/utils";
import { NEWSNET_BOARDS, type NewsNetBoard } from "@/lib/newsnet";

interface BoardTabsProps {
  active: NewsNetBoard;
  onChange: (board: NewsNetBoard) => void;
}

export function BoardTabs({ active, onChange }: BoardTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="NewsNet boards"
      className="flex gap-1 border-b border-amber-700/30 bg-stone-900/40"
    >
      {NEWSNET_BOARDS.map((board) => {
        const isActive = board === active;
        return (
          <button
            key={board}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(board)}
            className={cn(
              "px-4 py-2 font-mono text-sm tracking-tight transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60",
              isActive
                ? "border-b-2 border-amber-400 text-amber-100"
                : "border-b-2 border-transparent text-stone-400 hover:text-amber-200"
            )}
          >
            {board}
          </button>
        );
      })}
    </div>
  );
}
