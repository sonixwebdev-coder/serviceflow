import { cn } from '@/lib/utils';
import { getFileUrl } from '@/utils/api';

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

const heightClasses = {
  small: 'min-h-[300px]',
  medium: 'min-h-[450px]',
  large: 'min-h-[600px]',
  full: 'min-h-screen',
};

const layoutClasses = {
  centered: 'items-center justify-center text-center',
  left: 'items-center justify-start text-left',
  right: 'items-center justify-end text-right',
};

const HeroBlock = ({ data, settings, isEditing = false, onClick }) => {
  const {
    title = 'Bine ati venit',
    subtitle = '',
    backgroundImage = '',
    backgroundOverlay = 0.4,
    ctaText = '',
    ctaLink = '',
    ctaStyle = 'primary',
    secondaryCtaText = '',
    secondaryCtaLink = '',
    layout = 'centered',
    height = 'medium',
  } = data || {};

  const {
    backgroundColor = '#1e3a5f',
    textColor = '#ffffff',
    padding = { top: 60, bottom: 60 },
  } = settings || {};

  const buttonStyleClasses = {
    primary: 'bg-white text-gray-900 hover:bg-gray-100',
    secondary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border-2 border-white text-white hover:bg-white hover:text-gray-900',
  };

  return (
    <div
      className={cn(
        'relative flex w-full',
        heightClasses[height] || heightClasses.medium,
        layoutClasses[layout] || layoutClasses.centered,
        isEditing && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2'
      )}
      style={{
        backgroundColor: backgroundImage ? undefined : backgroundColor,
        paddingTop: `${padding.top}px`,
        paddingBottom: `${padding.bottom}px`,
      }}
      onClick={onClick}
    >
      {/* Background Image */}
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${getFileUrl(backgroundImage)})` }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0, 0, 0, ${backgroundOverlay})` }}
          />
        </>
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 max-w-4xl px-6',
          layout === 'left' && 'ml-12',
          layout === 'right' && 'mr-12'
        )}
      >
        {title && (
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            style={{ color: textColor }}
          >
            {title}
          </h1>
        )}

        {subtitle && (
          <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl" style={{ color: textColor }}>
            {subtitle}
          </p>
        )}

        {(ctaText || secondaryCtaText) && (
          <div
            className={cn(
              'flex gap-4',
              layout === 'centered' && 'justify-center',
              layout === 'right' && 'justify-end'
            )}
          >
            {ctaText && (
              <button
                className={cn(
                  'px-6 py-3 font-medium rounded-lg transition-colors',
                  buttonStyleClasses[ctaStyle] || buttonStyleClasses.primary
                )}
                onClick={(e) => {
                  if (isEditing) {
                    e.stopPropagation();
                    return;
                  }
                  if (ctaLink && isSafeUrl(ctaLink)) {
                    window.location.href = ctaLink;
                  }
                }}
              >
                {ctaText}
              </button>
            )}

            {secondaryCtaText && (
              <button
                className="px-6 py-3 font-medium rounded-lg border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-colors"
                onClick={(e) => {
                  if (isEditing) {
                    e.stopPropagation();
                    return;
                  }
                  if (secondaryCtaLink && isSafeUrl(secondaryCtaLink)) {
                    window.location.href = secondaryCtaLink;
                  }
                }}
              >
                {secondaryCtaText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const heroBlockDefaults = {
  title: 'Bine ati venit',
  subtitle: 'Servicii profesionale pentru dvs.',
  backgroundImage: '',
  backgroundOverlay: 0.4,
  ctaText: 'Programeaza',
  ctaLink: '/booking',
  ctaStyle: 'primary',
  secondaryCtaText: '',
  secondaryCtaLink: '',
  layout: 'centered',
  height: 'medium',
};

export default HeroBlock;
