import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, ImageIcon } from 'lucide-react';

const GalleryBlock = ({ data, settings, isEditing = false, onClick }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const {
    title = 'Galerie',
    subtitle = '',
    images = [],
    columns = 3,
    layout = 'grid',
    showLightbox = true,
    showCategories = false,
  } = data || {};

  const {
    backgroundColor = '#ffffff',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'xl',
  } = settings || {};

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  // Get unique categories
  const categories = [...new Set(images.map((img) => img.category).filter(Boolean))];
  const filteredImages = selectedCategory === 'all'
    ? images
    : images.filter((img) => img.category === selectedCategory);

  const openLightbox = (index) => {
    if (isEditing || !showLightbox) return;
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % filteredImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
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
      <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="text-center mb-8">
            {title && (
              <h2
                className="text-3xl font-bold mb-4"
                style={{ color: textColor }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Category Filter */}
        {showCategories && categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
              onClick={() => setSelectedCategory('all')}
              disabled={isEditing}
            >
              Toate
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
                onClick={() => setSelectedCategory(category)}
                disabled={isEditing}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {/* Gallery Grid */}
        {filteredImages.length > 0 ? (
          <div
            className={cn(
              'grid gap-4',
              layout === 'masonry' ? 'masonry' : columnClasses[columns] || columnClasses[3]
            )}
          >
            {filteredImages.map((image, index) => (
              <div
                key={index}
                className={cn(
                  'relative group overflow-hidden rounded-lg cursor-pointer',
                  layout === 'masonry' && index % 3 === 0 && 'row-span-2'
                )}
                onClick={() => openLightbox(index)}
              >
                <img
                  src={image.src}
                  alt={image.alt || `Image ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {(image.caption || (showCategories && image.category)) && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <div className="text-white">
                      {image.caption && <p className="font-medium">{image.caption}</p>}
                      {showCategories && image.category && (
                        <p className="text-sm opacity-75">{image.category}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p>Adaugati imagini din setari</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {!isEditing && showLightbox && lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300"
          >
            <X className="h-8 w-8" />
          </button>

          {filteredImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300"
              >
                <ChevronLeft className="h-10 w-10" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:text-gray-300"
              >
                <ChevronRight className="h-10 w-10" />
              </button>
            </>
          )}

          {filteredImages[currentImageIndex] && (
            <div className="flex flex-col items-center p-8">
              <img
                src={filteredImages[currentImageIndex].src}
                alt={filteredImages[currentImageIndex].alt || ''}
                className="max-h-[70vh] object-contain"
              />
              {filteredImages[currentImageIndex].caption && (
                <p className="mt-4 text-white text-center">
                  {filteredImages[currentImageIndex].caption}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const galleryBlockDefaults = {
  title: 'Galerie',
  subtitle: 'Lucrarile noastre',
  images: [],
  columns: 3,
  layout: 'grid',
  showLightbox: true,
  showCategories: false,
};

export default GalleryBlock;
