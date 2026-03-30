import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Gift, Trophy, Star, Copy, Check, ArrowUpRight, ArrowDownRight, Users, UserPlus } from 'lucide-react';
import { useLoyaltyDashboard, useLoyaltyTransactions, useLoyaltyReferral, useApplyReferral } from '@/hooks/useLoyalty';
import { loyaltyService } from '@/services/loyaltyService';
import { QRCodeSVG } from 'qrcode.react';

const TIER_CONFIG = {
  BRONZE: { label: 'Bronze', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', ring: 'text-amber-500' },
  SILVER: { label: 'Silver', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', ring: 'text-gray-400' },
  GOLD: { label: 'Gold', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400', ring: 'text-yellow-500' },
  PLATINUM: { label: 'Platinum', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', ring: 'text-indigo-500' },
};

const TX_LABELS = {
  EARN_PAYMENT: 'Plata',
  EARN_REFERRAL: 'Referral',
  EARN_MANUAL: 'Bonus',
  REDEEM_DISCOUNT: 'Reducere',
  REDEEM_REWARD: 'Recompensa',
  EXPIRE: 'Expirat',
  DEDUCT_MANUAL: 'Deducere',
};

function TierProgressRing({ currentTier, lifetimePoints, thresholds }) {
  const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
  const config = TIER_CONFIG[currentTier] || TIER_CONFIG.BRONZE;

  if (!nextTier) {
    return (
      <div className="flex flex-col items-center">
        <div className={`relative w-28 h-28 rounded-full border-4 ${config.border} flex items-center justify-center`}>
          <Trophy className={`h-10 w-10 ${config.ring}`} />
        </div>
        <p className="text-sm text-gray-500 mt-2">Nivel maxim!</p>
      </div>
    );
  }

  const nextThreshold = thresholds?.[nextTier.toLowerCase() + 'Threshold'] || thresholds?.[nextTier] || 1;
  const progress = Math.min(100, Math.round((lifetimePoints / nextThreshold) * 100));
  const remaining = Math.max(0, nextThreshold - lifetimePoints);

  // SVG circle progress
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke="currentColor"
            className={config.ring}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{progress}%</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Inca {remaining.toLocaleString()} puncte pana la {TIER_CONFIG[nextTier].label}
      </p>
    </div>
  );
}

export default function Loyalty() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [txPage, setTxPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  const { data: dashboardData, isLoading: dashLoading } = useLoyaltyDashboard();
  const { data: txData, isLoading: txLoading } = useLoyaltyTransactions({ page: txPage, limit: 10 });
  const { data: referralData } = useLoyaltyReferral();
  const applyMutation = useApplyReferral();

  // Pre-fill from URL param and auto-validate
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setReferralInput(code);
      setSearchParams({}, { replace: true });
      // Auto-validate after a brief moment so the user sees what's happening
      const timer = setTimeout(async () => {
        setValidating(true);
        try {
          const result = await loyaltyService.validateReferralCode(code);
          if (result.valid) {
            setValidationResult(result);
          } else {
            setValidationError(result.error || 'Cod de referral invalid');
          }
        } catch {
          setValidationError('Eroare la validarea codului');
        } finally {
          setValidating(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const dashboard = dashboardData?.data || dashboardData;
  const account = dashboard?.account;
  const program = dashboard?.program;
  const tier = dashboard?.tier;
  const transactions = txData?.data || txData;
  const referral = referralData?.data || referralData;

  const tierConfig = TIER_CONFIG[account?.currentTier] || TIER_CONFIG.BRONZE;

  const handleCopyCode = () => {
    const code = referral?.referralCode || account?.referralCode;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidateCode = async () => {
    const code = referralInput.trim();
    if (!code) return;
    setValidating(true);
    setValidationError('');
    setValidationResult(null);
    try {
      const result = await loyaltyService.validateReferralCode(code);
      if (result.valid) {
        setValidationResult(result);
      } else {
        setValidationError(result.error || 'Cod de referral invalid');
      }
    } catch {
      setValidationError('Eroare la validarea codului');
    } finally {
      setValidating(false);
    }
  };

  const handleApplyCode = () => {
    const code = referralInput.trim();
    applyMutation.mutate(code, {
      onSuccess: (data) => {
        setApplySuccess(`Cod aplicat! Ai primit ${data.pointsEarned} puncte.`);
        setReferralInput('');
        setValidationResult(null);
      },
      onError: (err) => {
        setValidationError(err.response?.data?.message || 'Eroare la aplicarea codului');
        setValidationResult(null);
      },
    });
  };

  const showReferralInput = account && !account.referredById && !applySuccess;

  if (dashLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <Gift className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Programul de fidelitate</h2>
        <p className="text-sm text-gray-500 mt-1">
          Programul de fidelitate nu este inca activ pentru contul tau.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fidelitate</h1>
        <p className="text-sm text-gray-500 mt-1">Punctele si beneficiile tale</p>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <TierProgressRing
            currentTier={account.currentTier}
            lifetimePoints={account.lifetimePoints}
            thresholds={program}
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${tierConfig.bg} ${tierConfig.text} ${tierConfig.border}`}>
                {tierConfig.label}
              </span>
            </div>
            <p className="text-3xl font-bold">{account.currentPoints?.toLocaleString()}</p>
            <p className="text-sm text-gray-300">puncte disponibile</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
              <span>{account.lifetimePoints?.toLocaleString()} puncte totale</span>
              <span>{account.completedVisits} vizite</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <Star className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
          <p className="text-xl font-bold text-gray-900">{account.completedVisits}</p>
          <p className="text-xs text-gray-500">Vizite</p>
        </div>
        {tier?.discount > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <Gift className="h-5 w-5 mx-auto text-indigo-500 mb-1" />
            <p className="text-xl font-bold text-gray-900">{tier.discount}%</p>
            <p className="text-xs text-gray-500">Reducere nivel</p>
          </div>
        )}
        {program?.visitRewardEnabled && program?.visitRewardEveryN > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-bold text-gray-900">
              {account.completedVisits % program.visitRewardEveryN}/{program.visitRewardEveryN}
            </p>
            <p className="text-xs text-gray-500">Pana la recompensa</p>
          </div>
        )}
      </div>

      {/* Referral + QR Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Referral Code */}
        {(referral?.referralCode || account?.referralCode) && (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-semibold text-gray-900">Codul tau de referral</h3>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-900">
                {referral?.referralCode || account?.referralCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 transition-colors"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            {referral?.referralCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {referral.referralCount} {referral.referralCount === 1 ? 'persoana recomandata' : 'persoane recomandate'}
              </p>
            )}
          </div>
        )}

        {/* QR Code */}
        {account?.referralCode && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col items-center">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Card QR</h3>
            <div className="bg-white p-3 rounded-xl border border-gray-100">
              <QRCodeSVG value={`${window.location.origin}/loyalty?code=${account.referralCode}`} size={140} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Scanati pentru identificare</p>
          </div>
        )}
      </div>

      {/* Referral Success Message */}
      {applySuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-700">{applySuccess}</p>
        </div>
      )}

      {/* Apply Referral Code */}
      {showReferralInput && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="h-5 w-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-900">Aplica cod referral</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Ai primit un cod de referral? Introdu-l mai jos pentru a primi puncte bonus.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={referralInput}
              onChange={(e) => {
                setReferralInput(e.target.value.toUpperCase());
                setValidationResult(null);
                setValidationError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (validationResult) {
                    handleApplyCode();
                  } else if (referralInput.trim()) {
                    handleValidateCode();
                  }
                }
              }}
              placeholder="REF-XXXXXX"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
            />
            {!validationResult ? (
              <button
                onClick={handleValidateCode}
                disabled={!referralInput.trim() || validating}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {validating ? 'Se verifica...' : 'Verifica'}
              </button>
            ) : (
              <button
                onClick={handleApplyCode}
                disabled={applyMutation.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {applyMutation.isPending ? 'Se aplica...' : 'Aplica'}
              </button>
            )}
          </div>
          {validationError && (
            <p className="text-sm text-red-600 mt-2">{validationError}</p>
          )}
          {validationResult && (
            <p className="text-sm text-green-600 mt-2">
              Cod valid - recomandat de <span className="font-medium">{validationResult.referrerName}</span>
            </p>
          )}
        </div>
      )}

      {/* Transaction History */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="p-5 pb-3">
          <h3 className="text-base font-semibold text-gray-900">Istoric tranzactii</h3>
        </div>
        {txLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions?.items?.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-1.5 ${tx.points > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.points > 0
                      ? <ArrowUpRight className="h-4 w-4 text-green-600" />
                      : <ArrowDownRight className="h-4 w-4 text-red-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {TX_LABELS[tx.type] || tx.type}
                    </p>
                    {tx.description && (
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{tx.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(tx.createdAt).toLocaleDateString('ro-RO')}
                  </p>
                </div>
              </div>
            ))}
            {(!transactions?.items || transactions.items.length === 0) && (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                Nicio tranzactie gasita
              </div>
            )}
          </div>
        )}
        {transactions?.pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <button
              onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              disabled={txPage === 1}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Inapoi
            </button>
            <span className="text-sm text-gray-500">
              {txPage} / {transactions.pagination.pages}
            </span>
            <button
              onClick={() => setTxPage((p) => Math.min(transactions.pagination.pages, p + 1))}
              disabled={txPage === transactions.pagination.pages}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              Inainte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
