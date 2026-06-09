export default function ShopLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="h-9 w-48 rounded bg-gray-200 animate-pulse mb-8" />
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-56 shrink-0 space-y-3">
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[3/4] rounded-lg bg-gray-200 animate-pulse" />
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
