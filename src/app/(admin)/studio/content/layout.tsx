import type { ReactNode } from "react";
import { StudioNav } from "@/components/contentStudio/StudioNav";

export default function ContentStudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3">
        <h1 className="text-lg font-semibold text-slate-800">Content Studio</h1>
      </div>

      {/* Tab navigation */}
      <StudioNav />

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
