"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BriefContext } from "./BriefContext";
import type { StudioRecord } from "@/types/studio";
import { apiRequest } from "@/lib/contentStudio/apiClient";
export function WorkspaceBanner() {
  const [briefs,setBriefs] = useState<StudioRecord[]>([]);
  const [label,setLabel] = useState("Released content · read only");
  useEffect(() => {
    async function refresh() {
      const id = sessionStorage.getItem("studio.workspace");
      if (!id) { setBriefs([]); setLabel("Released content · read only"); return; }
      const result = await apiRequest<{ workspace: { title: string; status: string }; inheritedBriefs?: StudioRecord[] }>(`/api/admin/studio?workspace=${id}`);
      setBriefs(result.data?.inheritedBriefs ?? []);
      setLabel(result.data?.workspace ? `${result.data.workspace.title} · ${result.data.workspace.status} workspace` : "Workspace unavailable");
    }
    void refresh();
    window.addEventListener("studio-workspace-change", refresh);
    return () => window.removeEventListener("studio-workspace-change", refresh);
  },[]);
  return <><div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-xs text-indigo-900"><span>{label} · Draft saves do not change player content</span><Link href="/studio/content/work" className="underline">Choose workspace</Link></div>{briefs.length > 0 && <details className="max-h-80 overflow-auto border-b bg-indigo-50 px-4 py-2"><summary className="cursor-pointer text-xs font-medium text-indigo-900">Assignment direction & inherited constraints ({briefs.length})</summary><div className="py-3"><BriefContext plans={briefs}/></div></details>}</>;
}
