import { cn } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

const StatsBlock = ({ data, settings, isEditing = false, onClick }) => {
  const {
    title = '',
    subtitle = '',
    stats = [],
    columns = 4,
  } = data || {};

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'xl',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
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
      <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
        {(title || subtitle) && (
          <div className="text-center mb-10">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
            )}
          </div>
        )}

        {stats.length > 0 ? (
          <div className={cn('grid gap-6', gridCols[columns] || gridCols[4])}>
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6">
                <div className="text-4xl md:text-5xl font-bold mb-2 text-blue-600">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
                {stat.description && (
                  <p className="text-gray-400 text-sm mt-1">{stat.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p>Adaugati statistici din setari</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const statsBlockDefaults = {
  title: '',
  subtitle: '',
  stats: [],
  columns: 4,
};

export default StatsBlock;
