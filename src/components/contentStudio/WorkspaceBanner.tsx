"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/contentStudio/apiClient";
export function WorkspaceBanner() {
  const [label,setLabel] = useState("Released content · read only");
  useEffect(() => {
    async function refresh() {
      const id = sessionStorage.getItem("studio.workspace");
      if (!id) { setLabel("Released content · read only"); return; }
      const result = await apiRequest<{ workspace: { title: string; status: string } }>(`/api/admin/studio?workspace=${id}`);
      setLabel(result.data?.workspace ? `${result.data.workspace.title} · ${result.data.workspace.status} workspace` : "Workspace unavailable");
    }
    void refresh();
    window.addEventListener("studio-workspace-change", refresh);
    return () => window.removeEventListener("studio-workspace-change", refresh);
  },[]);
  return <div className="flex items-center justify-between border-b border-indigo-100 bg-indigo-50 px-4 py-2 text-xs text-indigo-900"><span>{label} · Draft saves do not change player content</span><Link href="/studio/content/work" className="underline">Choose workspace</Link></div>;
}
