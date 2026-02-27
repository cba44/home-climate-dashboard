export function SensorCardSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md p-5 flex flex-col gap-3 border border-zinc-100 dark:border-zinc-800 animate-pulse">
      {/* Room name placeholder */}
      <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />

      {/* Primary readings placeholder */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
          <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
        <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-700" />
        <div className="flex flex-col items-center gap-1">
          <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
          <div className="h-7 w-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>

      {/* Secondary readings placeholder */}
      <div className="flex gap-3">
        <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-3 w-10 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>

      {/* Last updated placeholder */}
      <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-700 rounded" />
    </div>
  );
}
