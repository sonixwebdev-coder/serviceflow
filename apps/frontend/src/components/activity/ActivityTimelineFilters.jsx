import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import DatePicker from '../ui/DatePicker';
import { ACTION_FILTER_OPTIONS, ENTITY_FILTER_OPTIONS } from './activityPresentation';

export default function ActivityTimelineFilters({
  activeFilterCount,
  filters,
  onChange,
  onClear,
  users,
}) {
  return (
    <section
      aria-label="Filtre activitate"
      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium text-gray-900">Filtre</h2>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-3.5 w-3.5" />
            Sterge filtrele
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <FilterSelect
          label="Tip entitate"
          value={filters.entityType}
          options={ENTITY_FILTER_OPTIONS}
          allLabel="Toate"
          onChange={(value) => onChange('entityType', value)}
        />
        <FilterSelect
          label="Actiune"
          value={filters.action}
          options={ACTION_FILTER_OPTIONS}
          allLabel="Toate"
          onChange={(value) => onChange('action', value)}
        />
        <FilterSelect
          label="Utilizator"
          value={filters.actorId}
          options={users.map((user) => ({
            value: user.id,
            label: `${user.firstName} ${user.lastName}`,
          }))}
          allLabel="Toti"
          onChange={(value) => onChange('actorId', value)}
        />
        <DatePicker
          label="De la"
          value={filters.dateFrom ? parseISO(filters.dateFrom) : null}
          onChange={(date) => onChange('dateFrom', date ? format(date, 'yyyy-MM-dd') : '')}
          maxDate={new Date()}
          placeholder="Selecteaza data"
        />
        <DatePicker
          label="Pana la"
          value={filters.dateTo ? parseISO(filters.dateTo) : null}
          onChange={(date) => onChange('dateTo', date ? format(date, 'yyyy-MM-dd') : '')}
          minDate={filters.dateFrom ? parseISO(filters.dateFrom) : undefined}
          maxDate={new Date()}
          placeholder="Selecteaza data"
        />
      </div>
    </section>
  );
}

function FilterSelect({ label, value, options, allLabel, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
