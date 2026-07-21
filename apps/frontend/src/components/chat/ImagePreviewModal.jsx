import { useEffect, useCallback, useRef } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

/**
 * Image Preview Modal Component
 * Full-screen image preview with zoom and download capabilities
 */
export default function ImagePreviewModal({ isOpen, onClose, src, alt, fileName }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef(null);

  // Reset zoom when modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside image
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Zoom functions
  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.5, 0.5);
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  // Handle mouse wheel zoom with non-passive event listener
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || !isOpen) return;

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    };

    // Add event listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isOpen, zoomIn, zoomOut]);

  // Handle drag to pan
  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging && scale > 1) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, scale]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add mouse move and up listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Download image
  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'image';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  // Open in new tab
  const handleOpenInNewTab = () => {
    window.open(src, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-linear-to-b from-black/50 to-transparent">
        <div className="text-white">
          {fileName && <p className="text-sm font-medium truncate max-w-md">{fileName}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={zoomOut}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            title="Micșorează"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-white/80 text-sm min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            title="Mărește"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          {/* Actions */}
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            title="Descarcă"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            title="Deschide în tab nou"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            title="Închide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div ref={imageContainerRef} className="relative max-w-[90vw] max-h-[80vh] overflow-hidden">
        <img
          src={src}
          alt={alt || fileName || 'Preview'}
          className={`max-w-full max-h-[80vh] object-contain transition-transform ${
            scale > 1 ? 'cursor-grab' : 'cursor-default'
          } ${isDragging ? 'cursor-grabbing' : ''}`}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
          onMouseDown={handleMouseDown}
          draggable={false}
        />
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
        Folosește scroll pentru zoom • Escape pentru a închide
      </div>
    </div>
  );
}
