import { cn } from '@/lib/utils';

export default function ImageBlock({ data, settings }) {
  const { src, alt, caption, link } = data;
  const { rounded = true, shadow = true } = settings || {};

  if (!src) return null;

  const imageElement = (
    <figure>
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        className={cn(
          'w-full h-auto',
          rounded && 'rounded-lg',
          shadow && 'shadow-lg'
        )}
      />
      {caption && (
        <figcaption className="mt-3 text-sm text-gray-500 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer">
        {imageElement}
      </a>
    );
  }

  return imageElement;
}
