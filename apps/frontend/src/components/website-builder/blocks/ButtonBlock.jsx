import { cn } from '@/lib/utils';
import { getWebsiteBuilderIcon } from '../iconRegistry';

const isSafeUrl = (url) => {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const ButtonBlock = ({ data, settings, isEditing = false, onClick }) => {
  const {
    text = 'Click aici',
    link = '',
    style = 'primary',
    size = 'md',
    icon = '',
    openInNewTab = false,
  } = data || {};

  const {
    backgroundColor = 'transparent',
    padding = { top: 20, bottom: 20 },
    alignment = 'center',
  } = settings || {};

  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const styleClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
  };

  // Get icon component if specified
  const IconComponent = getWebsiteBuilderIcon(icon);

  const handleClick = (e) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }
    if (link && isSafeUrl(link)) {
      if (openInNewTab) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = link;
      }
    }
  };

  return (
    <div
      className={cn(
        'w-full px-6 flex',
        alignmentClasses[alignment],
        isEditing && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2'
      )}
      style={{
        backgroundColor,
        paddingTop: `${padding.top}px`,
        paddingBottom: `${padding.bottom}px`,
      }}
      onClick={onClick}
    >
      <button
        className={cn(
          'inline-flex items-center gap-2 font-medium rounded-lg transition-colors',
          sizeClasses[size] || sizeClasses.md,
          styleClasses[style] || styleClasses.primary
        )}
        onClick={handleClick}
      >
        {IconComponent && <IconComponent className="h-4 w-4" />}
        {text}
      </button>
    </div>
  );
};

export const buttonBlockDefaults = {
  text: 'Click aici',
  link: '',
  style: 'primary',
  size: 'md',
  icon: '',
  openInNewTab: false,
};

export default ButtonBlock;
