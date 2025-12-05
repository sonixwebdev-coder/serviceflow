import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getMonth,
  getYear,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  setMonth,
  setYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import roLocale from 'date-fns/locale/ro';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const weekdayLabels = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'];
const monthLabels = [
  'Ianuarie',
  'Februarie',
  'Martie',
  'Aprilie',
  'Mai',
  'Iunie',
  'Iulie',
  'August',
  'Septembrie',
  'Octombrie',
  'Noiembrie',
  'Decembrie',
];

const DatePicker = ({
  label,
  value = null,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Selecteaza data',
  dateFormat = 'dd.MM.yyyy',
  disabled = false,
  required = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef(null);
  const normalizedMinDate = minDate ? startOfDay(minDate) : undefined;
  const normalizedMaxDate = maxDate ? startOfDay(maxDate) : undefined;

useEffect(() => {
  if (value) {
    setVisibleMonth(new Date(value));
  }
}, [value]);

useEffect(() => {
  if (normalizedMinDate && isBefore(visibleMonth, startOfMonth(normalizedMinDate))) {
    setVisibleMonth(new Date(normalizedMinDate));
    return;
  }
  if (normalizedMaxDate && isAfter(visibleMonth, endOfMonth(normalizedMaxDate))) {
    setVisibleMonth(new Date(normalizedMaxDate));
  }
}, [visibleMonth, normalizedMinDate, normalizedMaxDate]);

  useEffect(() => {
    const handleClickAway = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      window.addEventListener('mousedown', handleClickAway);
      window.addEventListener('touchstart', handleClickAway);
    }

    return () => {
      window.removeEventListener('mousedown', handleClickAway);
      window.removeEventListener('touchstart', handleClickAway);
    };
  }, [open]);

  const selectedDate = value ? new Date(value) : null;

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1, locale: roLocale });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1, locale: roLocale });
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const minYear = minDate ? getYear(minDate) : currentYear - 80;
    const maxYear = maxDate ? getYear(maxDate) : currentYear + 20;
    const years = [];
    for (let year = minYear; year <= maxYear; year += 1) {
      years.push(year);
    }
    return years;
  }, [minDate, maxDate]);

  const handleMonthSelect = (event) => {
    const monthIndex = Number(event.target.value);
    setVisibleMonth((current) => {
      let next = setMonth(current, monthIndex);
      if (normalizedMinDate && isAfter(normalizedMinDate, endOfMonth(next))) {
        next = new Date(normalizedMinDate);
      }
      if (normalizedMaxDate && isBefore(normalizedMaxDate, startOfMonth(next))) {
        next = new Date(normalizedMaxDate);
      }
      return next;
    });
  };

  const handleYearSelect = (event) => {
    const year = Number(event.target.value);
    setVisibleMonth((current) => {
      let next = setYear(current, year);
      if (normalizedMinDate && isAfter(normalizedMinDate, endOfMonth(next))) {
        next = new Date(normalizedMinDate);
      }
      if (normalizedMaxDate && isBefore(normalizedMaxDate, startOfMonth(next))) {
        next = new Date(normalizedMaxDate);
      }
      return next;
    });
  };

  const handleSelect = (day) => {
    if (disabled) return;
    if (normalizedMinDate && isBefore(day, normalizedMinDate)) return;
    if (normalizedMaxDate && isAfter(day, normalizedMaxDate)) return;

    onChange?.(day);
    setOpen(false);
  };

  const displayValue = selectedDate ? format(selectedDate, dateFormat, { locale: roLocale }) : '';
  const prevMonth = addMonths(visibleMonth, -1);
  const nextMonth = addMonths(visibleMonth, 1);
  const canGoPrev = !normalizedMinDate || !isBefore(endOfMonth(prevMonth), normalizedMinDate);
  const canGoNext = !normalizedMaxDate || !isAfter(startOfMonth(nextMonth), normalizedMaxDate);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {label}
          {required ? <span className="ml-1 text-red-500">*</span> : null}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-left text-sm transition focus:border-viperx-primary focus:outline-none focus:ring-2 focus:ring-viperx-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
          displayValue ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        <span>{displayValue || placeholder}</span>
        <Calendar size={18} className="text-gray-400" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
            <button
              type="button"
              className={`rounded-lg p-1 ${canGoPrev ? 'text-gray-600 transition hover:bg-gray-100 hover:text-gray-900' : 'cursor-not-allowed text-gray-300'}`}
              onClick={() => canGoPrev && setVisibleMonth((current) => addMonths(current, -1))}
              disabled={!canGoPrev}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={getMonth(visibleMonth)}
                onChange={handleMonthSelect}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-viperx-primary focus:outline-none focus:ring-2 focus:ring-viperx-primary/40"
              >
                {monthLabels.map((label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={getYear(visibleMonth)}
                onChange={handleYearSelect}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-viperx-primary focus:outline-none focus:ring-2 focus:ring-viperx-primary/40"
              >
                {yearOptions.map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={`rounded-lg p-1 ${canGoNext ? 'text-gray-600 transition hover:bg-gray-100 hover:text-gray-900' : 'cursor-not-allowed text-gray-300'}`}
              onClick={() => canGoNext && setVisibleMonth((current) => addMonths(current, 1))}
              disabled={!canGoNext}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="px-4 pb-4">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-gray-400">
              {weekdayLabels.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
              {days.map((day) => {
                const isMuted = !isSameMonth(day, visibleMonth);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isDisabled =
                  (normalizedMinDate && isBefore(day, normalizedMinDate)) ||
                  (normalizedMaxDate && isAfter(day, normalizedMaxDate));

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelect(day)}
                    disabled={isDisabled}
                    className={`rounded-lg px-0 py-2 text-center transition focus:outline-none focus:ring-2 focus:ring-viperx-primary/40 disabled:cursor-not-allowed disabled:opacity-30 ${
                      isSelected
                        ? 'bg-viperx-primary text-white hover:bg-orange-600'
                        : isMuted
                        ? 'text-gray-400 hover:bg-gray-100'
                        : 'text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
