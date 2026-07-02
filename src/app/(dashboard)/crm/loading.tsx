import { Skeleton } from "@/components/ui/skeleton";

export default function CrmLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-card/50 p-5"
          >
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-4 h-8 w-24" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-72 rounded-full" />
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-white/[0.04] px-4 py-4 last:border-0"
          >
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
