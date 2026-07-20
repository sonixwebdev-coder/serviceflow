import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

function getEmbedUrl(url) {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function getThumbnail(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
  return null;
}

export default function VideoBlock({ data, branding }) {
  const { title, subtitle, url, thumbnail, aspectRatio = '16:9', autoplay = false } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';
  const [playing, setPlaying] = useState(autoplay);
  const embedUrl = getEmbedUrl(url);
  const thumbUrl = thumbnail || getThumbnail(url);

  const aspectClasses = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '21:9': 'aspect-[21/9]',
  };

  if (!url) {
    return (
      <div className="text-center text-gray-500 py-12">
        <Play className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>Nu a fost adaugat niciun video.</p>
      </div>
    );
  }

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-8">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-3">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      <div
        className={cn(
          'relative rounded-xl overflow-hidden shadow-lg mx-auto max-w-4xl',
          aspectClasses[aspectRatio] || aspectClasses['16:9']
        )}
      >
        {embedUrl && (playing || autoplay) ? (
          <iframe
            src={`${embedUrl}?autoplay=1&rel=0`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
            title={title || 'Video'}
          />
        ) : (
          <button onClick={() => setPlaying(true)} className="absolute inset-0 w-full h-full group">
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={title || 'Video thumbnail'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-900" />
            )}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform"
                style={{ backgroundColor: primaryColor }}
              >
                <Play className="h-8 w-8 text-white ml-1" fill="white" />
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
