/**
 * Consistent loading skeletons for analytics components
 */

// Base skeleton element with pulse animation
export const SkeletonBox = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// Skeleton for metric cards
export const MetricCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-3">
        <SkeletonBox className="h-4 w-24" />
        <SkeletonBox className="h-8 w-32" />
        <SkeletonBox className="h-3 w-20" />
      </div>
      <SkeletonBox className="h-12 w-12 rounded-lg" />
    </div>
  </div>
);

// Skeleton for charts (area/bar charts)
export const ChartSkeleton = ({ height = 300 }) => (
  <div className="space-y-4" style={{ height }}>
    {/* Chart area */}
    <div className="flex-1 flex items-end gap-2 px-4 pt-8">
      {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <SkeletonBox
            className="w-full rounded-t"
            style={{ height: `${h}%` }}
          />
        </div>
      ))}
    </div>
    {/* X-axis labels */}
    <div className="flex justify-between px-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonBox key={i} className="h-3 w-10" />
      ))}
    </div>
  </div>
);

// Skeleton for list items (like top clients)
export const ListSkeleton = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <SkeletonBox className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-1/3" />
          <SkeletonBox className="h-3 w-1/4" />
        </div>
        <SkeletonBox className="h-4 w-20" />
      </div>
    ))}
  </div>
);

// Skeleton for invoice aging buckets
export const BucketsSkeleton = ({ rows = 5 }) => (
  <div className="space-y-4">
    {/* Summary cards */}
    <div className="grid grid-cols-2 gap-4">
      <SkeletonBox className="h-24 rounded-lg" />
      <SkeletonBox className="h-24 rounded-lg" />
    </div>
    {/* Buckets */}
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBox key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  </div>
);

// Skeleton for status breakdown grid
export const StatusGridSkeleton = ({ cols = 5 }) => (
  <div className={`grid grid-cols-${cols} gap-2`}>
    {Array.from({ length: cols }).map((_, i) => (
      <SkeletonBox key={i} className="h-16 rounded-lg" />
    ))}
  </div>
);

// Skeleton for the revenue card
export const RevenueCardSkeleton = () => (
  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-5 h-full">
    <div className="flex items-start justify-between mb-4">
      <div className="space-y-3">
        <SkeletonBox className="h-4 w-32" />
        <SkeletonBox className="h-9 w-40" />
      </div>
      <SkeletonBox className="h-12 w-12 rounded-xl" />
    </div>
    <div className="flex items-center gap-2 mb-4">
      <SkeletonBox className="h-6 w-16 rounded-full" />
      <SkeletonBox className="h-4 w-32" />
    </div>
    <SkeletonBox className="h-2 w-full rounded-full mb-4" />
    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
      <div className="flex items-center gap-2">
        <SkeletonBox className="h-8 w-8 rounded-lg" />
        <div className="space-y-1">
          <SkeletonBox className="h-3 w-16" />
          <SkeletonBox className="h-4 w-8" />
        </div>
      </div>
      <div className="space-y-1 text-right">
        <SkeletonBox className="h-3 w-12 ml-auto" />
        <SkeletonBox className="h-4 w-20" />
      </div>
    </div>
  </div>
);

export default {
  SkeletonBox,
  MetricCardSkeleton,
  ChartSkeleton,
  ListSkeleton,
  BucketsSkeleton,
  StatusGridSkeleton,
  RevenueCardSkeleton,
};
