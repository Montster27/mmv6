"use client";

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      role="dialog"
      aria-modal
      aria-label="Command palette"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-[560px] rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3">
          <span className="text-slate-500 text-sm">⌘</span>
          <input
            autoFocus
            placeholder="Search storylets, tracks, NPCs…"
            className="flex-1 bg-transparent text-slate-100 text-sm outline-none placeholder:text-slate-500"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <kbd className="kbd text-slate-500">esc</kbd>
        </div>
        <div className="px-4 py-6 text-center text-xs text-slate-500">
          Command palette — coming soon
        </div>
      </div>
    </div>
  );
}
