import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { uploadWebsiteImage } from '@/services/websiteService';

function ImageUploadField({ value, onChange, label, hint, accept, previewClass = 'max-h-12 object-contain' }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Imaginea nu poate depasi 5MB');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadWebsiteImage(file);
      onChange(url);
    } catch {
      alert('Eroare la incarcarea imaginii');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [onChange]);

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
          title="Incarca imagine"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 flex items-center px-2 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            title="Sterge"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept={accept || 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml'} onChange={handleFile} className="hidden" />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {value && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg inline-block">
          <img
            src={value}
            alt="Preview"
            className={previewClass}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}

export default ImageUploadField;
