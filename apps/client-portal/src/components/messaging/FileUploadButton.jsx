import { useRef, useState } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

/**
 * File upload button - passes selected file to parent for preview
 */
export default function FileUploadButton({ onUpload, isUploading, disabled }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Tip de fisier nepermis');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Maxim 10MB');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Pass file to parent for preview
    if (onUpload) {
      onUpload(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-red-50 text-red-600 text-xs rounded border border-red-200 whitespace-nowrap">
          {error}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className={cn(
          'p-2 rounded-full transition-colors',
          'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
        title="Ataseaza fisier"
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
