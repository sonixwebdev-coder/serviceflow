import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'span', 'div', 'hr', 'sub', 'sup',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'embed', 'object', 'form', 'input', 'textarea', 'select'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

export default function TextBlock({ data, settings }) {
  const { content, format = 'prose' } = data;
  const textColor = settings?.textColor;
  const alignment = settings?.alignment || 'center';

  if (!content) return null;

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (format === 'heading') {
    return (
      <div
        className={cn('text-3xl md:text-4xl font-bold max-w-4xl mx-auto', alignmentClasses[alignment])}
        style={textColor ? { color: textColor } : undefined}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, SANITIZE_CONFIG) }}
      />
    );
  }

  if (format === 'quote') {
    return (
      <div className={cn('max-w-3xl mx-auto', alignmentClasses[alignment])}>
        <blockquote
          className="border-l-4 border-blue-500 pl-6 py-4 bg-gray-50 rounded-r-lg italic text-lg text-gray-700"
          style={textColor ? { color: textColor } : undefined}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, SANITIZE_CONFIG) }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn('prose prose-lg max-w-3xl mx-auto', alignmentClasses[alignment])}
      style={textColor ? { color: textColor } : undefined}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, SANITIZE_CONFIG) }}
    />
  );
}
