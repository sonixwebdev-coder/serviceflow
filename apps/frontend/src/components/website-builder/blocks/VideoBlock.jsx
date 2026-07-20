import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';

function getThumbnail(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  return null;
}

const VideoBlock = ({ data, settings, isEditing = false, onClick }) => {
  const { title = '', subtitle = '', url = '', thumbnail = '', aspectRatio = '16:9' } = data || {};

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'lg',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const aspectClasses = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '21:9': 'aspect-[21/9]',
  };

  const thumbUrl = thumbnail || getThumbnail(url);

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
      <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                {title}
              </h2>
            )}
            {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
          </div>
        )}

        {url ? (
          <div
            className={cn(
              'relative rounded-xl overflow-hidden shadow-lg mx-auto max-w-4xl',
              aspectClasses[aspectRatio] || aspectClasses['16:9']
            )}
          >
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={title || 'Video thumbnail'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-900" />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-xl">
                <Play className="h-8 w-8 text-white ml-1" fill="white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Play className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p>Adaugati URL-ul video din setari</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const videoBlockDefaults = {
  title: '',
  subtitle: '',
  url: '',
  thumbnail: '',
  aspectRatio: '16:9',
  autoplay: false,
};

export default VideoBlock;
