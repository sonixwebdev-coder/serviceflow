import { cn } from '@/lib/utils';

const DividerBlock = ({ data, settings, isEditing = false, onClick }) => {
  const { style = 'line', thickness = 'thin' } = data || {};

  const {
    backgroundColor = 'transparent',
    padding = { top: 20, bottom: 20 },
    maxWidth = 'lg',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    full: 'max-w-full',
  };

  const thicknessClasses = {
    thin: 'border-t',
    medium: 'border-t-2',
    thick: 'border-t-4',
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
        {style === 'line' && <hr className={cn('border-gray-200', thicknessClasses[thickness])} />}

        {style === 'dots' && (
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full bg-gray-300',
                  thickness === 'thin' && 'w-1 h-1',
                  thickness === 'medium' && 'w-2 h-2',
                  thickness === 'thick' && 'w-3 h-3'
                )}
              />
            ))}
          </div>
        )}

        {style === 'space' && <div className="h-0" />}
      </div>
    </div>
  );
};

export const dividerBlockDefaults = {
  style: 'line',
  thickness: 'thin',
};

export default DividerBlock;
