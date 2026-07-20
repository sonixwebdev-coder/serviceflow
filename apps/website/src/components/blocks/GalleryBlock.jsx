import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { cn, resolveFileUrl } from '@/lib/utils';

export default function GalleryBlock({ data }) {
  const {
    title,
    subtitle,
    images = [],
    columns = 4,
    layout = 'grid', // grid or masonry
    showLightbox = true,
  } = data;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  const openLightbox = (index) => {
    if (showLightbox) {
      setCurrentIndex(index);
      setLightboxOpen(true);
    }
  };

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextImage();
      else if (e.key === 'ArrowLeft') prevImage();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, nextImage, prevImage, closeLightbox]);

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-10">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      {images.length === 0 ? (
        <p className="text-center text-gray-500">Nu exista imagini in galerie.</p>
      ) : (
        <div className={cn('grid gap-4', gridCols[columns] || gridCols[4])}>
          {images.map((image, index) => (
            <div
              key={index}
              className={cn(
                'relative overflow-hidden rounded-lg group',
                showLightbox && 'cursor-pointer',
                layout === 'masonry' && index % 3 === 0 && 'row-span-2'
              )}
              onClick={() => openLightbox(index)}
            >
              <img
                src={resolveFileUrl(image.src || image)}
                alt={image.alt || `Image ${index + 1}`}
                loading="lazy"
                className="w-full h-full object-cover aspect-square group-hover:scale-110 transition-transform duration-500"
              />
              {showLightbox && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 text-white p-3 hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          <img
            src={resolveFileUrl(images[currentIndex]?.src || images[currentIndex])}
            alt={images[currentIndex]?.alt || ''}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 text-white p-3 hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
}
