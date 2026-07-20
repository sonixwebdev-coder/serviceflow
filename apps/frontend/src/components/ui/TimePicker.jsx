import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Custom 24h time picker with scroll/arrow support.
 *
 * @param {string}   value       - Time string "HH:mm" (e.g. "09:00")
 * @param {function} onChange    - Called with new "HH:mm" string
 * @param {number}   minuteStep - Minute granularity: 1, 5, 15, 30 (default 15)
 * @param {string}   className  - Extra classes on the outer wrapper
 * @param {boolean}  disabled   - Disabled state
 * @param {string}   id         - Optional id for label association
 */
export default function TimePicker({
  value = '09:00',
  onChange,
  minuteStep = 15,
  className,
  disabled = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);

  const [hh, mm] = (value || '00:00').split(':').map(Number);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);

  const pad = (n) => String(n).padStart(2, '0');

  const emit = useCallback(
    (newHH, newMM) => {
      onChange?.(`${pad(newHH)}:${pad(newMM)}`);
    },
    [onChange]
  );

  const incrementHour = () => emit((hh + 1) % 24, mm);
  const decrementHour = () => emit((hh + 23) % 24, mm);
  const incrementMinute = () => {
    const nextIdx = (minutes.indexOf(mm) + 1) % minutes.length;
    const wrapsAround = nextIdx === 0;
    emit(wrapsAround ? (hh + 1) % 24 : hh, minutes[nextIdx]);
  };
  const decrementMinute = () => {
    const curIdx = minutes.indexOf(mm);
    const nextIdx = curIdx <= 0 ? minutes.length - 1 : curIdx - 1;
    const wrapsBack = curIdx <= 0;
    emit(wrapsBack ? (hh + 23) % 24 : hh, minutes[nextIdx]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Scroll selected hour/minute into view when dropdown opens
  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      hourListRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'instant' });
      minuteListRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)} id={id}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
          'bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          disabled
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 text-gray-900',
          isOpen && 'ring-2 ring-primary/30 border-primary'
        )}
      >
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="tabular-nums tracking-wide">
          {pad(hh)}:{pad(mm)}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-stretch p-2 gap-1">
            {/* Hour column */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={decrementHour}
                className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <div
                ref={hourListRef}
                className="h-[140px] w-14 overflow-y-auto scrollbar-thin rounded-lg"
              >
                <div className="flex flex-col py-1">
                  {hours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      data-selected={h === hh}
                      onClick={() => {
                        emit(h, mm);
                      }}
                      className={cn(
                        'mx-1 rounded-md px-2 py-1.5 text-sm tabular-nums text-center transition-colors',
                        h === hh
                          ? 'bg-primary text-white font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      {pad(h)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={incrementHour}
                className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Separator */}
            <div className="flex items-center px-0.5">
              <span className="text-lg font-bold text-gray-300">:</span>
            </div>

            {/* Minute column */}
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={decrementMinute}
                className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <div
                ref={minuteListRef}
                className="h-[140px] w-14 overflow-y-auto scrollbar-thin rounded-lg"
              >
                <div className="flex flex-col py-1">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-selected={m === mm}
                      onClick={() => {
                        emit(hh, m);
                      }}
                      className={cn(
                        'mx-1 rounded-md px-2 py-1.5 text-sm tabular-nums text-center transition-colors',
                        m === mm
                          ? 'bg-primary text-white font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      {pad(m)}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={incrementMinute}
                className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick-select footer */}
          <div className="border-t border-gray-100 px-2 py-1.5 flex gap-1">
            {[
              {
                label: 'Acum',
                action: () => {
                  const now = new Date();
                  emit(
                    now.getHours(),
                    minutes.reduce((prev, curr) =>
                      Math.abs(curr - now.getMinutes()) < Math.abs(prev - now.getMinutes())
                        ? curr
                        : prev
                    )
                  );
                },
              },
              { label: '09:00', action: () => emit(9, 0) },
              { label: '12:00', action: () => emit(12, 0) },
              { label: '18:00', action: () => emit(18, 0) },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  preset.action();
                  setIsOpen(false);
                }}
                className="flex-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
