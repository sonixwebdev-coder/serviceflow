import { Calendar } from 'lucide-react';
import { subDays, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

const PRESET_RANGES = [
  { label: '7 zile', value: '7d', getDates: () => ({ startDate: subDays(new Date(), 7), endDate: new Date() }) },
  { label: '30 zile', value: '30d', getDates: () => ({ startDate: subDays(new Date(), 30), endDate: new Date() }) },
  { label: '90 zile', value: '90d', getDates: () => ({ startDate: subDays(new Date(), 90), endDate: new Date() }) },
  { label: 'Luna aceasta', value: 'this_month', getDates: () => ({ startDate: startOfMonth(new Date()), endDate: new Date() }) },
  { label: 'Luna trecuta', value: 'last_month', getDates: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
  }},
  { label: '6 luni', value: '6m', getDates: () => ({ startDate: subMonths(new Date(), 6), endDate: new Date() }) },
  { label: '1 an', value: '1y', getDates: () => ({ startDate: subMonths(new Date(), 12), endDate: new Date() }) },
];

export default function DateRangeFilter({
  startDate,
  endDate,
  selectedPreset,
  onRangeChange,
  showCustom = true,
}) {
  const handlePresetClick = (preset) => {
    const dates = preset.getDates();
    onRangeChange({
      startDate: format(dates.startDate, 'yyyy-MM-dd'),
      endDate: format(dates.endDate, 'yyyy-MM-dd'),
      preset: preset.value,
    });
  };

  const handleCustomChange = (field, value) => {
    onRangeChange({
      startDate: field === 'startDate' ? value : startDate,
      endDate: field === 'endDate' ? value : endDate,
      preset: 'custom',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {PRESET_RANGES.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetClick(preset)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition ${
              selectedPreset === preset.value
                ? 'bg-viperx-primary text-white border-viperx-primary'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => handleCustomChange('startDate', e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-viperx-primary/20 focus:border-viperx-primary"
            />
          </div>
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={endDate || ''}
            onChange={(e) => handleCustomChange('endDate', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-viperx-primary/20 focus:border-viperx-primary"
          />
        </div>
      )}
    </div>
  );
}
