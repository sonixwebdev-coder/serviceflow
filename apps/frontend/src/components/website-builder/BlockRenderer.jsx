import {
  HeroBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  ServicesGridBlock,
  TeamGridBlock,
  LocationsMapBlock,
  BookingWidgetBlock,
  ContactFormBlock,
  GalleryBlock,
  TestimonialsBlock,
  DividerBlock,
  SpacerBlock,
  FaqBlock,
  StatsBlock,
  VideoBlock,
  PricingTableBlock,
} from './blocks';

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

const BlockRenderer = ({ block, isEditing = false, isSelected = false, onClick, crmData = {} }) => {
  const BlockComponent = blockComponents[block.type];

  if (!BlockComponent) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-600">Tip de bloc necunoscut: {block.type}</p>
      </div>
    );
  }

  // Get CRM data based on block type
  let blockCrmData = [];
  if (block.type === 'services-grid' && block.data?.autoSync) {
    blockCrmData = crmData.services || [];
  } else if (block.type === 'team-grid' && block.data?.autoSync) {
    blockCrmData = crmData.team || [];
  } else if (block.type === 'locations-map' && block.data?.autoSync) {
    blockCrmData = crmData.locations || [];
  }

  return (
    <div
      className={`relative ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      data-block-id={block.id}
      onClick={onClick}
    >
      <BlockComponent
        data={block.data}
        settings={block.settings}
        isEditing={isEditing}
        crmData={blockCrmData}
      />
    </div>
  );
};

export default BlockRenderer;
