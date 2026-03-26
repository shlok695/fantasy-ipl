export function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass-panel overflow-hidden rounded-[36px] p-6 sm:p-8">
        <div className="skeleton h-5 w-40 rounded-full" />
        <div className="mt-6 space-y-4">
          <div className="skeleton h-14 w-3/4 rounded-3xl" />
          <div className="skeleton h-5 w-full rounded-full sm:w-2/3" />
          <div className="flex gap-3">
            <div className="skeleton h-12 w-40 rounded-2xl" />
            <div className="skeleton h-12 w-40 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="glass-panel rounded-[24px] p-5">
            <div className="skeleton h-12 w-12 rounded-2xl" />
            <div className="mt-4 space-y-3">
              <div className="skeleton h-4 w-24 rounded-full" />
              <div className="skeleton h-6 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
