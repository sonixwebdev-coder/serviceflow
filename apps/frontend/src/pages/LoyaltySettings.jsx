import { useState, useEffect } from 'react';
import { Save, Gift, Star, Users, Clock, Award } from 'lucide-react';
import { useLoyaltyProgram, useUpdateLoyaltyProgram } from '../hooks/useLoyalty';
import useToast from '../context/useToast';

const TIER_COLORS = {
  BRONZE: 'bg-amber-100 text-amber-800 border-amber-300',
  SILVER: 'bg-gray-100 text-gray-800 border-gray-300',
  GOLD: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PLATINUM: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

const REWARD_TYPES = [
  { value: 'BONUS_POINTS', label: 'Puncte bonus' },
  { value: 'DISCOUNT_PERCENT', label: 'Reducere procentuala' },
  { value: 'DISCOUNT_FIXED', label: 'Reducere fixa (RON)' },
  { value: 'FREE_APPOINTMENT', label: 'Programare gratuita' },
];

export default function LoyaltySettings() {
  const { data: programData, isLoading } = useLoyaltyProgram();
  const updateProgram = useUpdateLoyaltyProgram();
  const { showToast } = useToast();

  const program = programData?.data || programData;

  const [form, setForm] = useState({
    isEnabled: false,
    pointsPerRon: 1,
    bronzeThreshold: 100,
    silverThreshold: 500,
    goldThreshold: 1000,
    platinumThreshold: 5000,
    bronzeDiscount: 0,
    silverDiscount: 5,
    goldDiscount: 10,
    platinumDiscount: 15,
    visitRewardEnabled: false,
    visitRewardEveryN: 10,
    visitRewardType: 'BONUS_POINTS',
    visitRewardValue: 50,
    referralEnabled: false,
    referralBonusPoints: 100,
    referralNewClientPts: 50,
    pointsExpiryDays: 0,
  });

  useEffect(() => {
    if (program) {
      setForm({
        isEnabled: program.isEnabled ?? false,
        pointsPerRon: Number(program.pointsPerRon) || 1,
        bronzeThreshold: program.bronzeThreshold ?? 100,
        silverThreshold: program.silverThreshold ?? 500,
        goldThreshold: program.goldThreshold ?? 1000,
        platinumThreshold: program.platinumThreshold ?? 5000,
        bronzeDiscount: Number(program.bronzeDiscount) || 0,
        silverDiscount: Number(program.silverDiscount) || 5,
        goldDiscount: Number(program.goldDiscount) || 10,
        platinumDiscount: Number(program.platinumDiscount) || 15,
        visitRewardEnabled: program.visitRewardEnabled ?? false,
        visitRewardEveryN: program.visitRewardEveryN ?? 10,
        visitRewardType: program.visitRewardType ?? 'BONUS_POINTS',
        visitRewardValue: Number(program.visitRewardValue) || 50,
        referralEnabled: program.referralEnabled ?? false,
        referralBonusPoints: program.referralBonusPoints ?? 100,
        referralNewClientPts: program.referralNewClientPts ?? 50,
        pointsExpiryDays: program.pointsExpiryDays ?? 0,
      });
    }
  }, [program]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProgram.mutateAsync(form);
      showToast({ title: 'Program de fidelitate actualizat', type: 'success' });
    } catch (error) {
      showToast({ title: 'Eroare la salvare', description: error.message, type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Program de Fidelitate</h1>
          <p className="text-sm text-gray-500 mt-1">Configurati sistemul de puncte si recompense pentru clienti</p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateProgram.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save size={16} />
          {updateProgram.isPending ? 'Se salveaza...' : 'Salveaza'}
        </button>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift size={20} className="text-indigo-600" />
            <div>
              <h3 className="text-base font-semibold text-gray-900">Activeaza programul de fidelitate</h3>
              <p className="text-sm text-gray-500">Clientii vor acumula puncte pentru plati si vizite</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.isEnabled}
            onClick={() => handleChange('isEnabled', !form.isEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              form.isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              form.isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Points Config */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
          <Star size={18} className="text-indigo-600" />
          Configurare puncte
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Puncte per RON</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.pointsPerRon}
              onChange={(e) => handleChange('pointsPerRon', Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Cate puncte primeste clientul per RON platit</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expirare puncte (zile)</label>
            <input
              type="number"
              min="0"
              value={form.pointsExpiryDays}
              onChange={(e) => handleChange('pointsExpiryDays', Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">0 = fara expirare</p>
          </div>
        </div>
      </div>

      {/* Tier Config */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4">
          <Award size={18} className="text-indigo-600" />
          Configurare niveluri
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((tier) => {
            const tierLower = tier.toLowerCase();
            const names = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold', PLATINUM: 'Platinum' };
            return (
              <div key={tier} className={`rounded-lg border-2 p-4 ${TIER_COLORS[tier]}`}>
                <h4 className="font-semibold mb-3">{names[tier]}</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Prag (puncte lifetime)</label>
                    <input
                      type="number"
                      min="0"
                      value={form[`${tierLower}Threshold`]}
                      onChange={(e) => handleChange(`${tierLower}Threshold`, Number(e.target.value))}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Reducere (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form[`${tierLower}Discount`]}
                      onChange={(e) => handleChange(`${tierLower}Discount`, Number(e.target.value))}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm bg-white"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visit Rewards */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Clock size={18} className="text-indigo-600" />
            Recompense vizite
          </h3>
          <button
            type="button"
            role="switch"
            aria-checked={form.visitRewardEnabled}
            onClick={() => handleChange('visitRewardEnabled', !form.visitRewardEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              form.visitRewardEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              form.visitRewardEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        {form.visitRewardEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">La fiecare N vizite</label>
              <input
                type="number"
                min="1"
                value={form.visitRewardEveryN}
                onChange={(e) => handleChange('visitRewardEveryN', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tip recompensa</label>
              <select
                value={form.visitRewardType}
                onChange={(e) => handleChange('visitRewardType', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {REWARD_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valoare</label>
              <input
                type="number"
                min="0"
                value={form.visitRewardValue}
                onChange={(e) => handleChange('visitRewardValue', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Referral Program */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Users size={18} className="text-indigo-600" />
            Program de recomandari
          </h3>
          <button
            type="button"
            role="switch"
            aria-checked={form.referralEnabled}
            onClick={() => handleChange('referralEnabled', !form.referralEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              form.referralEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
              form.referralEnabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        {form.referralEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puncte bonus (referrer)</label>
              <input
                type="number"
                min="0"
                value={form.referralBonusPoints}
                onChange={(e) => handleChange('referralBonusPoints', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Puncte pentru cel care recomanda</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puncte bonus (client nou)</label>
              <input
                type="number"
                min="0"
                value={form.referralNewClientPts}
                onChange={(e) => handleChange('referralNewClientPts', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Puncte de bun-venit pentru clientul nou</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
