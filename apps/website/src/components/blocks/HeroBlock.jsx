import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const isSafeUrl = (url) => {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch { return false; }
};

export default function HeroBlock({ data, settings, subdomain, branding }) {
  const {
    title,
    subtitle,
    backgroundImage,
    backgroundOverlay = 0.5,
    ctaText,
    ctaLink,
    secondaryCtaText,
    secondaryCtaLink,
    layout = 'centered',
    height = 'large',
  } = data;

  const heightClasses = {
    small: 'min-h-[300px]',
    medium: 'min-h-[450px]',
    large: 'min-h-[600px]',
    full: 'min-h-screen',
  };

  const primaryColor = branding?.primaryColor || '#2563eb';

  return (
    <div
      className={cn(
        'relative flex items-center',
        heightClasses[height] || heightClasses.large
      )}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: backgroundOverlay }}
        />
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 w-full px-4 sm:px-6 lg:px-8',
          layout === 'centered' && 'text-center',
          layout === 'left' && 'text-left',
          layout === 'right' && 'text-right'
        )}
      >
        <div
          className={cn(
            'max-w-4xl mx-auto',
            layout === 'left' && 'ml-0',
            layout === 'right' && 'mr-0'
          )}
        >
          <h1
            className={cn(
              'text-4xl md:text-5xl lg:text-6xl font-bold mb-4',
              backgroundImage ? 'text-white' : 'text-gray-900'
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'text-lg md:text-xl mb-8 max-w-2xl',
                layout === 'centered' && 'mx-auto',
                backgroundImage ? 'text-gray-200' : 'text-gray-600'
              )}
            >
              {subtitle}
            </p>
          )}
          {(ctaText || secondaryCtaText) && (
            <div
              className={cn(
                'flex gap-4 flex-wrap',
                layout === 'centered' && 'justify-center',
                layout === 'right' && 'justify-end'
              )}
            >
              {ctaText && ctaLink && isSafeUrl(ctaLink) && (
                <Link
                  to={ctaLink.startsWith('/') ? `/${subdomain}${ctaLink}` : ctaLink}
                  className="inline-flex items-center px-6 py-3 rounded-lg text-white font-semibold transition-colors hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  {ctaText}
                </Link>
              )}
              {secondaryCtaText && secondaryCtaLink && isSafeUrl(secondaryCtaLink) && (
                <Link
                  to={secondaryCtaLink.startsWith('/') ? `/${subdomain}${secondaryCtaLink}` : secondaryCtaLink}
                  className={cn(
                    'inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-colors border-2',
                    backgroundImage
                      ? 'text-white border-white hover:bg-white/10'
                      : 'text-gray-900 border-gray-300 hover:bg-gray-100'
                  )}
                >
                  {secondaryCtaText}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
