import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import HeroBlock from './HeroBlock';
import TextBlock from './TextBlock';
import ImageBlock from './ImageBlock';
import ButtonBlock from './ButtonBlock';
import ServicesGridBlock from './ServicesGridBlock';
import TeamGridBlock from './TeamGridBlock';
import LocationsMapBlock from './LocationsMapBlock';
import BookingWidgetBlock from './BookingWidgetBlock';
import ContactFormBlock from './ContactFormBlock';
import GalleryBlock from './GalleryBlock';
import TestimonialsBlock from './TestimonialsBlock';
import DividerBlock from './DividerBlock';
import SpacerBlock from './SpacerBlock';
import FaqBlock from './FaqBlock';
import StatsBlock from './StatsBlock';
import VideoBlock from './VideoBlock';
import PricingTableBlock from './PricingTableBlock';

const blockComponents = {
  hero: HeroBlock,
  text: TextBlock,
  image: ImageBlock,
  button: ButtonBlock,
  'services-grid': ServicesGridBlock,
  'team-grid': TeamGridBlock,
  'locations-map': LocationsMapBlock,
  'booking-widget': BookingWidgetBlock,
  'contact-form': ContactFormBlock,
  gallery: GalleryBlock,
  testimonials: TestimonialsBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
  faq: FaqBlock,
  stats: StatsBlock,
  video: VideoBlock,
  'pricing-table': PricingTableBlock,
};

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

// Blocks that shouldn't animate (layout utility blocks)
const noAnimationBlocks = new Set(['divider', 'spacer']);

function useScrollAnimation(type) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (noAnimationBlocks.has(type)) {
      setIsVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [type]);

  return { ref, isVisible };
}

export default function BlockRenderer({ block, subdomain, branding }) {
  const { type, data, settings } = block;
  const BlockComponent = blockComponents[type];
  const { ref, isVisible } = useScrollAnimation(type);

  if (!BlockComponent) {
    console.warn(`Unknown block type: ${type}`);
    return null;
  }

  const paddingTop = settings?.padding?.top ?? 40;
  const paddingBottom = settings?.padding?.bottom ?? 40;
  const maxWidth = settings?.maxWidth || 'lg';
  const backgroundColor = settings?.backgroundColor;
  const alignment = settings?.alignment || 'center';

  // Full-width blocks (hero, etc.) don't need container constraints
  const isFullWidth = type === 'hero' || settings?.fullWidth;

  return (
    <section
      ref={ref}
      className={cn(
        'block-section transition-all duration-700 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        alignment === 'center' && 'text-center',
        alignment === 'left' && 'text-left',
        alignment === 'right' && 'text-right'
      )}
      style={{
        paddingTop: `${paddingTop}px`,
        paddingBottom: `${paddingBottom}px`,
        backgroundColor: backgroundColor || undefined,
      }}
    >
      {isFullWidth ? (
        <BlockComponent
          data={data}
          settings={settings}
          subdomain={subdomain}
          branding={branding}
        />
      ) : (
        <div className={cn('mx-auto px-4 sm:px-6 lg:px-8', maxWidthClasses[maxWidth])}>
          <BlockComponent
            data={data}
            settings={settings}
            subdomain={subdomain}
            branding={branding}
          />
        </div>
      )}
    </section>
  );
}
