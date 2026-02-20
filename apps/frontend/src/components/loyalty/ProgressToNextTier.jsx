const TIER_NAMES = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold', PLATINUM: 'Platinum' };
const TIER_COLORS = {
  BRONZE: 'bg-amber-500',
  SILVER: 'bg-gray-500',
  GOLD: 'bg-yellow-500',
  PLATINUM: 'bg-indigo-500',
};

export default function ProgressToNextTier({ currentTier, lifetimePoints, thresholds }) {
  if (!thresholds) return null;

  const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;

  if (!nextTier) {
    return (
      <div className="text-sm text-indigo-600 font-medium">
        Nivel maxim atins!
      </div>
    );
  }

  const nextThreshold = thresholds[nextTier.toLowerCase() + 'Threshold'] || thresholds[nextTier];
  const progress = Math.min(100, Math.round((lifetimePoints / nextThreshold) * 100));
  const remaining = Math.max(0, nextThreshold - lifetimePoints);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{TIER_NAMES[currentTier]}</span>
        <span>{TIER_NAMES[nextTier]}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${TIER_COLORS[nextTier]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        Inca {remaining} puncte pana la {TIER_NAMES[nextTier]}
      </p>
    </div>
  );
}
