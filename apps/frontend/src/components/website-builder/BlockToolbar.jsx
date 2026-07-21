import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, Copy, Trash2, Settings, GripVertical } from 'lucide-react';

const BlockToolbar = ({
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onSettings,
  canMoveUp = true,
  canMoveDown = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'absolute -top-10 left-1/2 -translate-x-1/2 z-10',
        'flex items-center gap-1 bg-white rounded-lg shadow-lg border p-1',
        className
      )}
    >
      {/* Drag Handle */}
      <div className="px-1 cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="w-px h-5 bg-gray-200" />

      {/* Move Up */}
      <button
        className={cn(
          'h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-gray-100 transition-colors',
          !canMoveUp && 'opacity-50 cursor-not-allowed'
        )}
        onClick={onMoveUp}
        disabled={!canMoveUp}
        title="Muta sus"
      >
        <ArrowUp className="h-4 w-4" />
      </button>

      {/* Move Down */}
      <button
        className={cn(
          'h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-gray-100 transition-colors',
          !canMoveDown && 'opacity-50 cursor-not-allowed'
        )}
        onClick={onMoveDown}
        disabled={!canMoveDown}
        title="Muta jos"
      >
        <ArrowDown className="h-4 w-4" />
      </button>

      <div className="w-px h-5 bg-gray-200" />

      {/* Duplicate */}
      <button
        className="h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-gray-100 transition-colors"
        onClick={onDuplicate}
        title="Duplica"
      >
        <Copy className="h-4 w-4" />
      </button>

      {/* Settings */}
      <button
        className="h-7 w-7 inline-flex items-center justify-center rounded-sm hover:bg-gray-100 transition-colors"
        onClick={onSettings}
        title="Setari bloc"
      >
        <Settings className="h-4 w-4" />
      </button>

      <div className="w-px h-5 bg-gray-200" />

      {/* Delete */}
      <button
        className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
        onClick={onDelete}
        title="Sterge"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

export default BlockToolbar;
