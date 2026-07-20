import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

const widthClasses = {
  small: 'max-w-md',
  medium: 'max-w-xl',
  large: 'max-w-3xl',
  full: 'max-w-full',
};

const aspectRatioClasses = {
  auto: '',
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  '21:9': 'aspect-[21/9]',
};

const ImageBlock = ({ data, settings, isEditing = false, onClick }) => {
  const {
    src = '',
    alt = '',
    caption = '',
    width = 'medium',
    aspectRatio = 'auto',
    link = '',
  } = data || {};

  const {
    backgroundColor = 'transparent',
    padding = { top: 40, bottom: 40 },
    alignment = 'center',
  } = settings || {};

  const alignmentClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
  };

  const ImageContent = () => (
    <div className={cn(widthClasses[width], alignmentClasses[alignment])}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn('w-full rounded-lg object-cover', aspectRatioClasses[aspectRatio])}
        />
      ) : (
        <div
          className={cn(
            'w-full bg-gray-100 rounded-lg flex items-center justify-center',
            aspectRatio === 'auto' ? 'min-h-[200px]' : aspectRatioClasses[aspectRatio]
          )}
        >
          <ImageIcon className="h-16 w-16 text-gray-300" />
        </div>
      )}

      {caption && <p className="mt-2 text-sm text-gray-500 text-center">{caption}</p>}
    </div>
  );

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
      {link && !isEditing ? (
        <a href={link} className="block">
          <ImageContent />
        </a>
      ) : (
        <ImageContent />
      )}
    </div>
  );
};

export const imageBlockDefaults = {
  src: '',
  alt: '',
  caption: '',
  width: 'medium',
  aspectRatio: 'auto',
  link: '',
};

export default ImageBlock;
