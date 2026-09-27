const EquipmentCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft md:rounded-2xl">
    <div className="aspect-square shimmer" />
    <div className="space-y-3 p-3 md:p-4">
      <div className="h-3 w-2/5 rounded-full shimmer" />
      <div className="h-4 w-full rounded-full shimmer" />
      <div className="h-4 w-3/4 rounded-full shimmer" />
      <div className="flex items-center justify-between pt-1">
        <div className="h-6 w-20 rounded-full shimmer" />
        <div className="h-9 w-9 rounded-full shimmer" />
      </div>
    </div>
  </div>
);

export default function EquipmentLoading() {
  return (
    <div
      className="min-h-screen bg-background pb-16 lg:pb-0"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading equipment"
    >
      <div className="border-b border-border bg-background">
        <div className="container flex h-16 items-center justify-between gap-6">
          <div className="h-10 w-32 rounded-lg shimmer" />
          <div className="hidden h-10 max-w-xl flex-1 rounded-full shimmer md:block" />
          <div className="flex gap-2">
            <div className="h-10 w-10 rounded-full shimmer" />
            <div className="h-10 w-10 rounded-full shimmer" />
          </div>
        </div>
      </div>

      <main className="container py-6 md:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden h-fit space-y-5 rounded-3xl border border-border bg-card p-5 shadow-soft lg:block">
            <div className="h-6 w-24 rounded-full shimmer" />
            {Array.from({ length: 3 }).map((_, groupIndex) => (
              <div className="space-y-3" key={`equipment-filter-group-${groupIndex}`}>
                <div className="h-4 w-20 rounded-full shimmer" />
                {Array.from({ length: groupIndex === 0 ? 5 : 4 }).map((__, itemIndex) => (
                  <div
                    className="h-9 rounded-xl shimmer"
                    key={`equipment-filter-${groupIndex}-${itemIndex}`}
                  />
                ))}
              </div>
            ))}
          </aside>

          <section>
            <div className="mb-5 flex gap-3 overflow-hidden pb-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div className="flex w-20 shrink-0 flex-col items-center gap-2" key={`equipment-category-${index}`}>
                  <div className="h-16 w-16 rounded-full shimmer" />
                  <div className="h-3 w-14 rounded-full shimmer" />
                </div>
              ))}
            </div>

            <div className="mb-3 h-4 w-36 rounded-full shimmer" />
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <EquipmentCardSkeleton key={`equipment-card-${index}`} />
              ))}
            </div>
          </section>
        </div>
      </main>
      <span className="sr-only">Loading equipment products...</span>
    </div>
  );
}
