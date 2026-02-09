import { cn } from '@/lib/utils';

const SpacerBlock = ({ data, settings, isEditing = false, onClick }) => {
  const {
    height = 60,
  } = data || {};

  const {
    backgroundColor = 'transparent',
  } = settings || {};

  return (
    <div
      className={cn(
        'w-full',
        isEditing && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 relative'
      )}
      style={{
        backgroundColor,
        height: `${height}px`,
      }}
      onClick={onClick}
    >
      {isEditing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border">
            Spatiu: {height}px
          </span>
        </div>
      )}
    </div>
  );
};

export const spacerBlockDefaults = {
  height: 60,
};

export default SpacerBlock;
