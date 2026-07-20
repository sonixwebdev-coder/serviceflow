// Block components
import HeroBlock, { heroBlockDefaults } from './HeroBlock';
import TextBlock, { textBlockDefaults } from './TextBlock';
import ImageBlock, { imageBlockDefaults } from './ImageBlock';
import ButtonBlock, { buttonBlockDefaults } from './ButtonBlock';
import ServicesGridBlock, { servicesGridBlockDefaults } from './ServicesGridBlock';
import TeamGridBlock, { teamGridBlockDefaults } from './TeamGridBlock';
import LocationsMapBlock, { locationsMapBlockDefaults } from './LocationsMapBlock';
import BookingWidgetBlock, { bookingWidgetBlockDefaults } from './BookingWidgetBlock';
import ContactFormBlock, { contactFormBlockDefaults } from './ContactFormBlock';
import GalleryBlock, { galleryBlockDefaults } from './GalleryBlock';
import TestimonialsBlock, { testimonialsBlockDefaults } from './TestimonialsBlock';
import DividerBlock, { dividerBlockDefaults } from './DividerBlock';
import SpacerBlock, { spacerBlockDefaults } from './SpacerBlock';
import FaqBlock, { faqBlockDefaults } from './FaqBlock';
import StatsBlock, { statsBlockDefaults } from './StatsBlock';
import VideoBlock, { videoBlockDefaults } from './VideoBlock';
import PricingTableBlock, { pricingTableBlockDefaults } from './PricingTableBlock';

export {
  HeroBlock,
  heroBlockDefaults,
  TextBlock,
  textBlockDefaults,
  ImageBlock,
  imageBlockDefaults,
  ButtonBlock,
  buttonBlockDefaults,
  ServicesGridBlock,
  servicesGridBlockDefaults,
  TeamGridBlock,
  teamGridBlockDefaults,
  LocationsMapBlock,
  locationsMapBlockDefaults,
  BookingWidgetBlock,
  bookingWidgetBlockDefaults,
  ContactFormBlock,
  contactFormBlockDefaults,
  GalleryBlock,
  galleryBlockDefaults,
  TestimonialsBlock,
  testimonialsBlockDefaults,
  DividerBlock,
  dividerBlockDefaults,
  SpacerBlock,
  spacerBlockDefaults,
  FaqBlock,
  faqBlockDefaults,
  StatsBlock,
  statsBlockDefaults,
  VideoBlock,
  videoBlockDefaults,
  PricingTableBlock,
  pricingTableBlockDefaults,
};

// Block type configuration
export const blockTypes = {
  hero: {
    name: 'Hero',
    description: 'Sectiune principala cu titlu si imagine de fundal',
    icon: 'Layout',
    defaults: heroBlockDefaults,
  },
  text: {
    name: 'Text',
    description: 'Bloc de text formatat',
    icon: 'Type',
    defaults: textBlockDefaults,
  },
  image: {
    name: 'Imagine',
    description: 'Imagine singulara cu legenda',
    icon: 'Image',
    defaults: imageBlockDefaults,
  },
  button: {
    name: 'Buton',
    description: 'Buton de actiune',
    icon: 'MousePointerClick',
    defaults: buttonBlockDefaults,
  },
  'services-grid': {
    name: 'Servicii',
    description: 'Grid cu serviciile oferite',
    icon: 'Grid3x3',
    defaults: servicesGridBlockDefaults,
    supportsCrmSync: true,
  },
  'team-grid': {
    name: 'Echipa',
    description: 'Prezentarea membrilor echipei',
    icon: 'Users',
    defaults: teamGridBlockDefaults,
    supportsCrmSync: true,
  },
  'locations-map': {
    name: 'Locatii',
    description: 'Harta si informatii despre locatii',
    icon: 'MapPin',
    defaults: locationsMapBlockDefaults,
    supportsCrmSync: true,
  },
  'booking-widget': {
    name: 'Programare',
    description: 'Widget pentru programari online',
    icon: 'Calendar',
    defaults: bookingWidgetBlockDefaults,
  },
  'contact-form': {
    name: 'Contact',
    description: 'Formular de contact',
    icon: 'Mail',
    defaults: contactFormBlockDefaults,
  },
  gallery: {
    name: 'Galerie',
    description: 'Galerie de imagini',
    icon: 'Images',
    defaults: galleryBlockDefaults,
  },
  testimonials: {
    name: 'Testimoniale',
    description: 'Recenzii de la clienti',
    icon: 'Quote',
    defaults: testimonialsBlockDefaults,
  },
  divider: {
    name: 'Separator',
    description: 'Linie sau spatiu de separare',
    icon: 'Minus',
    defaults: dividerBlockDefaults,
  },
  spacer: {
    name: 'Spatiu',
    description: 'Spatiu gol vertical',
    icon: 'MoveVertical',
    defaults: spacerBlockDefaults,
  },
  faq: {
    name: 'FAQ',
    description: 'Intrebari si raspunsuri frecvente',
    icon: 'HelpCircle',
    defaults: faqBlockDefaults,
  },
  stats: {
    name: 'Statistici',
    description: 'Numere si contoare animate',
    icon: 'BarChart3',
    defaults: statsBlockDefaults,
  },
  video: {
    name: 'Video',
    description: 'Video YouTube sau Vimeo',
    icon: 'Play',
    defaults: videoBlockDefaults,
  },
  'pricing-table': {
    name: 'Preturi',
    description: 'Tabel cu pachete de preturi',
    icon: 'CreditCard',
    defaults: pricingTableBlockDefaults,
  },
};

// Block categories for the sidebar
export const blockCategories = [
  {
    name: 'Esentiale',
    blocks: ['hero', 'text', 'image', 'button'],
  },
  {
    name: 'CRM',
    blocks: ['services-grid', 'team-grid', 'locations-map'],
  },
  {
    name: 'Interactiune',
    blocks: ['booking-widget', 'contact-form'],
  },
  {
    name: 'Media',
    blocks: ['gallery', 'testimonials', 'video'],
  },
  {
    name: 'Continut',
    blocks: ['faq', 'stats', 'pricing-table'],
  },
  {
    name: 'Layout',
    blocks: ['divider', 'spacer'],
  },
];
