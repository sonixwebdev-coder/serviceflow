import { useState } from 'react';
import { Share2, Facebook, MessageCircle, Link as LinkIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ShareButtons({ primaryColor }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = window.location.href;
  const title = document.title;

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`,
      '_blank'
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-2">
      {/* Share options */}
      {open && (
        <div className="flex flex-col gap-2 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={shareToFacebook}
            className="w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
            title="Distribuie pe Facebook"
          >
            <Facebook className="h-5 w-5" />
          </button>
          <button
            onClick={shareToWhatsApp}
            className="w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
            title="Distribuie pe WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            onClick={copyLink}
            className={cn(
              'w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-colors',
              copied ? 'text-green-600' : 'text-gray-600 hover:bg-gray-50'
            )}
            title={copied ? 'Link copiat!' : 'Copiaza link-ul'}
          >
            {copied ? <Check className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
          </button>
        </div>
      )}

      {/* Main toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:shadow-xl',
          open && 'rotate-45'
        )}
        style={{ backgroundColor: primaryColor }}
        title="Distribuie"
      >
        <Share2 className="h-6 w-6" />
      </button>
    </div>
  );
}
