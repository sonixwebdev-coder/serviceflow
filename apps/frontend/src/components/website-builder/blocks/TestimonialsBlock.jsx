import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Star, ChevronLeft, ChevronRight, Quote, User } from 'lucide-react';
import { getFileUrl } from '@/utils/api';

const TestimonialsBlock = ({ data, settings, isEditing = false, onClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const {
    title = 'Ce spun clientii',
    subtitle = '',
    testimonials = [],
    layout = 'carousel',
    showRating = true,
    showDate = false,
  } = data || {};

  const {
    backgroundColor = '#f9fafb',
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

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'h-4 w-4',
          i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
        )}
      />
    ));
  };

  const TestimonialCard = ({ testimonial, className }) => {
    const displayName = testimonial.name || testimonial.author || '';
    return (
    <div className={cn('bg-white rounded-lg border shadow-sm p-6', className)}>
      <Quote className="h-8 w-8 text-blue-200 mb-4" />

      <p className="text-gray-600 mb-6 italic">
        "{testimonial.content}"
      </p>

      <div className="flex items-center gap-4">
        {(testimonial.image || testimonial.avatar) ? (
          <img
            src={getFileUrl(testimonial.image || testimonial.avatar)}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : displayName ? (
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {displayName[0].toUpperCase()}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="h-6 w-6 text-gray-400" />
          </div>
        )}
        <div>
          <p className="font-semibold" style={{ color: textColor }}>
            {displayName}
          </p>
          {testimonial.role && (
            <p className="text-sm text-gray-500">{testimonial.role}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {showRating && testimonial.rating && (
          <div className="flex">{renderStars(testimonial.rating)}</div>
        )}
        {showDate && testimonial.date && (
          <span className="text-sm text-gray-400">{testimonial.date}</span>
        )}
      </div>
    </div>
    );
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
          <div className="text-center mb-12">
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

        {testimonials.length > 0 ? (
          <>
            {/* Carousel Layout */}
            {layout === 'carousel' && (
              <div className="relative">
                <div className="overflow-hidden">
                  <div className="max-w-2xl mx-auto">
                    <TestimonialCard testimonial={testimonials[currentIndex]} />
                  </div>
                </div>

                {testimonials.length > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                      onClick={prevTestimonial}
                      disabled={isEditing}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex gap-2">
                      {testimonials.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentIndex(index)}
                          disabled={isEditing}
                          className={cn(
                            'w-2 h-2 rounded-full transition-colors',
                            index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                          )}
                        />
                      ))}
                    </div>
                    <button
                      onClick={nextTestimonial}
                      disabled={isEditing}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Grid Layout */}
            {layout === 'grid' && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((testimonial, index) => (
                  <TestimonialCard key={index} testimonial={testimonial} />
                ))}
              </div>
            )}

            {/* List Layout */}
            {layout === 'list' && (
              <div className="space-y-6 max-w-2xl mx-auto">
                {testimonials.map((testimonial, index) => (
                  <TestimonialCard key={index} testimonial={testimonial} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Quote className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p>Adaugati testimoniale din setari</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const testimonialsBlockDefaults = {
  title: 'Ce spun clientii',
  subtitle: 'Recenzii de la clientii nostri multumiti',
  testimonials: [],
  layout: 'carousel',
  showRating: true,
  showDate: false,
};

export default TestimonialsBlock;
