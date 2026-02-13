import { Skeleton } from "@/components/ui/skeleton"

export function TheorySkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      {/* New hypothesis form placeholder */}
      <div className="space-y-2 rounded-md border border-slate-200 bg-white px-4 py-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-24" />
      </div>
      {/* Hypothesis list placeholders */}
      {[1, 2].map((i) => (
        <div
          key={i}
          className="space-y-2 rounded-md border border-slate-200 bg-white px-4 py-3"
        >
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
