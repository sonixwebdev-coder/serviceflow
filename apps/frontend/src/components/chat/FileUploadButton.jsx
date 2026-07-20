import { useRef, useState } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react';
import { useUploadFile } from '../../hooks/useChat';
import useToast from '../../context/useToast';

/**
 * File Upload Button Component
 * Handles file selection, preview, and upload to messages
 */
export default function FileUploadButton({ channelId, onUploadComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const uploadFileMutation = useUploadFile();

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showToast({
        title: 'Eroare',
        description: 'Fișierul trebuie să fie mai mic de 10MB.',
        type: 'error',
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !channelId) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('body', `A trimis un fișier: ${selectedFile.name}`);
      formData.append('type', selectedFile.type.startsWith('image/') ? 'IMAGE' : 'FILE');

      await uploadFileMutation.mutateAsync({
        channelId,
        formData,
      });

      showToast({
        title: 'Succes',
        description: 'Fișierul a fost încărcat cu succes.',
        type: 'success',
      });

      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      showToast({
        title: 'Eroare',
        description:
          error?.message || 'Nu s-a putut încărca fișierul. Te rugăm să încerci din nou.',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <File className="h-8 w-8 text-gray-400" />;

    if (selectedFile.type.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-primary" />;
    }
    if (selectedFile.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* File Input (Hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />

      {/* Upload Button */}
      {!selectedFile && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="Atașează fișier"
          disabled={isUploading}
        >
          <Paperclip className="h-5 w-5" />
        </button>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Încarcă Fișier</h3>
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="mb-4">
              {previewUrl ? (
                <div className="relative overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={previewUrl}
                    alt="Previzualizare"
                    className="h-48 w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
                  {getFileIcon()}
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="mb-4 rounded-lg bg-gray-50 p-3">
              <p className="truncate text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mb-4">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full animate-pulse bg-primary" style={{ width: '100%' }}></div>
                </div>
                <p className="mt-1 text-center text-xs text-gray-500">Se încarcă...</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anulează
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? 'Se încarcă...' : 'Încarcă'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
