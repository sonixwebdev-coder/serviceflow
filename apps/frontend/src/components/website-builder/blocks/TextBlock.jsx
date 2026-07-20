import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'img',
    'span',
    'div',
    'hr',
    'sub',
    'sup',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'embed', 'object', 'form', 'input', 'textarea', 'select'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

const formatClasses = {
  prose: 'prose prose-lg max-w-none',
  heading: 'text-3xl md:text-4xl font-bold',
  quote: 'text-lg italic border-l-4 border-blue-500 pl-6 py-4 bg-gray-50 rounded-r-lg',
};

const TextBlock = ({ data, settings, isEditing = false, onClick }) => {
  const { content = '', format = 'prose' } = data || {};

  const {
    backgroundColor = 'transparent',
    textColor = '#1f2937',
    padding = { top: 40, bottom: 40 },
    maxWidth = 'lg',
    alignment = 'center',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-5xl',
    full: 'max-w-full',
  };

  const alignmentClasses = {
    left: 'mr-auto text-left',
    center: 'mx-auto text-center',
    right: 'ml-auto text-right',
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
        className={cn(
          maxWidthClasses[maxWidth] || maxWidthClasses.lg,
          alignmentClasses[alignment] || alignmentClasses.center,
          formatClasses[format] || formatClasses.prose
        )}
        style={{ color: textColor }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, SANITIZE_CONFIG) }}
      />
    </div>
  );
};

export const textBlockDefaults = {
  content: '<p>Adaugati textul dvs. aici...</p>',
  format: 'prose',
};

export default TextBlock;
