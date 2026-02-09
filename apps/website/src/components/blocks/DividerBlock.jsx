import { cn } from '@/lib/utils';

export default function DividerBlock({ data, branding }) {
  const {
    style = 'solid', // solid, dashed, dotted
    width = 'full', // full, half, third
    color,
    thickness = 1,
  } = data || {};

  const primaryColor = branding?.primaryColor || '#e5e7eb';

  const widthClasses = {
    full: 'w-full',
    half: 'w-1/2',
    third: 'w-1/3',
  };

  return (
    <div className="flex justify-center py-4">
      <hr
        className={cn(
          'border-0',
          widthClasses[width] || widthClasses.full
        )}
        style={{
          borderTopStyle: style,
          borderTopWidth: `${thickness}px`,
          borderTopColor: color || primaryColor,
        }}
      />
    </div>
  );
}
