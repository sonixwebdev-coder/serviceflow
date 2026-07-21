import { cn } from '@/lib/utils';
import { Calendar, Clock, User } from 'lucide-react';

const BookingWidgetBlock = ({ data, settings, isEditing = false, onClick }) => {
  const {
    title = 'Programeaza o intalnire',
    subtitle = '',
    showServices = true,
    showEmployee = false,
  } = data || {};

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'md',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        'w-full px-6',
        isEditing && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2'
      )}
      style={{
        backgroundColor,
        paddingTop: `${padding.top}px`,
        paddingBottom: `${padding.bottom}px`,
      }}
      onClick={onClick}
    >
      <div
        className={cn('mx-auto bg-white rounded-lg border shadow-xs', maxWidthClasses[maxWidth])}
      >
        <div className="p-6 border-b text-center">
          <h3 className="font-semibold" style={{ color: textColor }}>
            {title}
          </h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="p-6 space-y-4">
          {/* Service Selection (placeholder) */}
          {showServices && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <User className="h-4 w-4" />
                Selectati serviciul
              </div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={isEditing}
              >
                <option>-- Alegeti un serviciu --</option>
              </select>
            </div>
          )}

          {/* Employee Selection (placeholder) */}
          {showEmployee && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <User className="h-4 w-4" />
                Selectati specialistul
              </div>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={isEditing}
              >
                <option>-- Orice specialist disponibil --</option>
              </select>
            </div>
          )}

          {/* Date Selection (placeholder) */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="h-4 w-4" />
              Selectati data
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'].map((day) => (
                <div key={day} className="text-center text-xs text-gray-400 py-1">
                  {day}
                </div>
              ))}
              {Array.from({ length: 14 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-center text-sm py-2 rounded-sm cursor-pointer',
                    i === 3 && 'bg-blue-600 text-white',
                    i !== 3 && 'hover:bg-gray-100'
                  )}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Time Selection (placeholder) */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Clock className="h-4 w-4" />
              Selectati ora
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(
                (time, i) => (
                  <button
                    key={time}
                    className={cn(
                      'w-full px-2 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      i === 2
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                    disabled={isEditing}
                  >
                    {time}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={isEditing}
          >
            Continua
          </button>
        </div>
      </div>
    </div>
  );
};

export const bookingWidgetBlockDefaults = {
  title: 'Programeaza o intalnire',
  subtitle: 'Selectati data si ora convenabila',
  showServices: true,
  showEmployee: false,
  compactMode: false,
};

export default BookingWidgetBlock;
