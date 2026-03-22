import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { cn, resolveFileUrl } from '@/lib/utils';
import { websiteService } from '@/services/websiteService';

export default function TestimonialsBlock({ data, branding, subdomain }) {
  const {
    title,
    subtitle,
    testimonials: templateTestimonials = [],
    layout = 'carousel',
    showRating = true,
    autoPlay = true,
    autoPlayInterval = 5000,
  } = data;

  // Fetch real approved reviews from API when on public site
  const { data: apiReviews } = useQuery({
    queryKey: ['approved-reviews', subdomain],
    queryFn: () => websiteService.getApprovedReviews(subdomain),
    enabled: !!subdomain,
    staleTime: 5 * 60 * 1000,
  });

  // Use API reviews on public site, fallback to template data in editor preview
  const testimonials = subdomain
    ? (apiReviews || [])
    : templateTestimonials;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewForm, setReviewForm] = useState({ name: '', email: '', content: '', rating: 5 });
  const [hoverRating, setHoverRating] = useState(0);
  const primaryColor = branding?.primaryColor || '#2563eb';

  useEffect(() => {
    if (layout === 'carousel' && autoPlay && testimonials.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      }, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [layout, autoPlay, autoPlayInterval, testimonials.length]);

  const reviewMutation = useMutation({
    mutationFn: (reviewData) => websiteService.submitReview(subdomain, reviewData),
    onSuccess: () => {
      setReviewSubmitted(true);
      setShowReviewForm(false);
      setReviewForm({ name: '', email: '', content: '', rating: 5 });
    },
  });

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewForm.name || !reviewForm.email || !reviewForm.content || reviewForm.content.length < 10) return;
    reviewMutation.mutate(reviewForm);
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'h-5 w-5',
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            )}
          />
        ))}
      </div>
    );
  };

  const renderTestimonial = (testimonial, index) => (
    <div
      key={index}
      className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
    >
      <Quote className="h-10 w-10 mb-4 opacity-20" style={{ color: primaryColor }} />
      {showRating && testimonial.rating && (
        <div className="mb-4">
          {renderStars(testimonial.rating)}
        </div>
      )}
      <p className="text-gray-700 mb-6 text-lg leading-relaxed italic">"{testimonial.content}"</p>
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        {testimonial.avatar ? (
          <img
            src={resolveFileUrl(testimonial.avatar)}
            alt={testimonial.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: primaryColor }}
          >
            {testimonial.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">{testimonial.name}</p>
          {testimonial.role && (
            <p className="text-sm text-gray-500">{testimonial.role}</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-12">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-3">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      {testimonials.length === 0 ? (
        <p className="text-center text-gray-500">Nu exista recenzii inca.</p>
      ) : layout === 'carousel' ? (
        <div className="relative max-w-2xl mx-auto">
          <div className="overflow-hidden">
            {renderTestimonial(testimonials[currentIndex], currentIndex)}
          </div>

          {testimonials.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % testimonials.length)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full transition-all duration-300',
                      index === currentIndex ? 'w-8' : 'bg-gray-300'
                    )}
                    style={index === currentIndex ? { backgroundColor: primaryColor } : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => renderTestimonial(testimonial, index))}
        </div>
      )}

      {/* Review Submission Section */}
      {subdomain && (
        <div className="mt-12 text-center">
          {reviewSubmitted ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
              <Star className="h-5 w-5 fill-green-600 text-green-600" />
              Multumim! Recenzia va fi publicata dupa aprobare.
            </div>
          ) : !showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-medium transition-all hover:shadow-md"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <Star className="h-5 w-5" />
              Lasa o recenzie
            </button>
          ) : (
            <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Scrie o recenzie</h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Star Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                        className="p-0.5"
                      >
                        <Star
                          className={cn(
                            'h-8 w-8 transition-colors',
                            star <= (hoverRating || reviewForm.rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
                    <input
                      type="text"
                      value={reviewForm.name}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                      placeholder="Numele tau"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={reviewForm.email}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
                      placeholder="email@exemplu.ro"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recenzia ta *</label>
                  <textarea
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, content: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent min-h-[100px]"
                    placeholder="Spune-ne experienta ta (minim 10 caractere)"
                    required
                    minLength={10}
                  />
                </div>

                {reviewMutation.isError && (
                  <p className="text-sm text-red-600">
                    {reviewMutation.error?.response?.data?.message || 'A aparut o eroare. Incearca din nou.'}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Anuleaza
                  </button>
                  <button
                    type="submit"
                    disabled={reviewMutation.isPending || !reviewForm.name || !reviewForm.email || reviewForm.content.length < 10}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Trimite recenzia'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
