import { cn } from '@/lib/utils';
import BlockRenderer from './BlockRenderer';

const PagePreview = ({ blocks, branding, crmData = {} }) => {
  const { primaryColor, secondaryColor, fontFamily } = branding || {};

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: fontFamily || 'system-ui, sans-serif',
        '--primary-color': primaryColor || '#3b82f6',
        '--secondary-color': secondaryColor || '#6366f1',
      }}
    >
      {blocks.map((block) => (
        <BlockRenderer
          key={block.id}
          block={block}
          isEditing={false}
          crmData={crmData}
        />
      ))}
    </div>
  );
};

export const PagePreviewFrame = ({ subdomain, slug = 'home', branding }) => {
  // This component renders the preview in an iframe
  const previewUrl = `${window.location.origin}/preview/${subdomain}/${slug}`;

  return (
    <div className="w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      <iframe
        src={previewUrl}
        className="w-full h-full border-0"
        title="Page Preview"
      />
    </div>
  );
};

export const ResponsivePreview = ({ blocks, branding, crmData, device = 'desktop' }) => {
  const deviceWidths = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-full',
  };

  return (
    <div className={cn(
      'mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300',
      deviceWidths[device]
    )}>
      <PagePreview
        blocks={blocks}
        branding={branding}
        crmData={crmData}
      />
    </div>
  );
};

export default PagePreview;
