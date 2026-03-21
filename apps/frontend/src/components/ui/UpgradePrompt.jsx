import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PLAN_NAMES } from '../../constants/plans';

/**
 * Reusable upgrade prompt shown when a user hits a plan limit.
 *
 * @param {string}  resource       - What was limited (e.g. "clienti", "utilizatori")
 * @param {string}  [suggestedPlan] - The plan they need (STARTER / PROFESSIONAL / ENTERPRISE)
 * @param {string}  [className]    - Optional wrapper className
 */
export default function UpgradePrompt({ resource, suggestedPlan, className = '' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 ${className}`}
    >
      <Zap className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
      <div>
        <p className="text-sm font-semibold text-orange-800">
          Ai atins limita de {resource} pentru planul curent
        </p>
        <p className="mt-1 text-sm text-orange-700">
          {suggestedPlan
            ? `Fa upgrade la planul ${PLAN_NAMES[suggestedPlan] || suggestedPlan} pentru a continua.`
            : 'Fa upgrade la un plan superior pentru a continua.'}
        </p>
        <Link
          to="/settings/billing"
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-orange-700"
        >
          <Zap className="h-3.5 w-3.5" />
          Upgrade plan
        </Link>
      </div>
    </div>
  );
}
