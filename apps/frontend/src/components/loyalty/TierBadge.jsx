const TIER_CONFIG = {
  BRONZE: { label: 'Bronze', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  SILVER: { label: 'Silver', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  GOLD: { label: 'Gold', className: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
  PLATINUM: { label: 'Platinum', className: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
};

export default function TierBadge({ tier, size = 'sm' }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  const sizeClasses = size === 'lg'
    ? 'px-3 py-1 text-sm'
    : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${config.className} ${sizeClasses}`}>
      {config.label}
    </span>
  );
}
