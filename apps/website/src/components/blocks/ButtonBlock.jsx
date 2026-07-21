import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

export default function ButtonBlock({ data, subdomain, branding }) {
  const { text, link, variant = 'primary', size = 'md', fullWidth = false } = data;
  const primaryColor = branding?.primaryColor || '#2563eb';

  if (!text || !link || !isSafeUrl(link)) return null;

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const isExternal =
    link.startsWith('http') || link.startsWith('mailto:') || link.startsWith('tel:');
  const href = isExternal ? link : `/${subdomain}${link}`;

  const className = cn(
    'inline-flex items-center justify-center font-semibold rounded-lg transition-colors',
    sizeClasses[size] || sizeClasses.md,
    fullWidth && 'w-full',
    variant === 'primary' && 'text-white hover:opacity-90',
    variant === 'secondary' && 'border-2 border-gray-300 text-gray-700 hover:bg-gray-100',
    variant === 'outline-solid' && 'border-2 text-primary-600 hover:bg-primary-50'
  );

  const style = variant === 'primary' ? { backgroundColor: primaryColor } : undefined;

  if (isExternal) {
    return (
      <a href={href} className={className} style={style} target="_blank" rel="noopener noreferrer">
        {text}
      </a>
    );
  }

  return (
    <Link to={href} className={className} style={style}>
      {text}
    </Link>
  );
}
