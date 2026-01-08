import React, { useState, useRef, useEffect } from 'react';

/**
 * Simple Emoji Picker Component
 * Displays a grid of common emojis organized by category
 */

const EMOJI_CATEGORIES = {
  'Frecvent folosite': ['😀', '😂', '😍', '🥰', '😊', '😉', '🤔', '😅', '😎', '🙄', '😴', '🤗'],
  'Gesturi': ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👋', '🤙', '💪', '🙏', '❤️'],
  'Expresii': ['😢', '😭', '😡', '🥺', '😱', '🤯', '🥳', '🤩', '😇', '🤓', '😬', '🤫'],
  'Obiecte': ['🎉', '🎊', '🎁', '🔥', '⭐', '💡', '💯', '✅', '❌', '⚡', '💬', '📌'],
  'Natură': ['☀️', '🌙', '⛅', '🌈', '🌸', '🌺', '🍀', '🌳', '🐶', '🐱', '🦋', '🐝'],
};

export default function EmojiPicker({ isOpen, onClose, onSelect, anchorRef }) {
  const pickerRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('Frecvent folosite');

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

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

  if (!isOpen) return null;

  const handleEmojiClick = (emoji) => {
    onSelect(emoji);
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      {/* Category Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-medium transition-colors ${
              activeCategory === category
                ? 'border-b-2 border-viperx-primary text-viperx-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {EMOJI_CATEGORIES[category][0]}
          </button>
        ))}
      </div>

      {/* Category Label */}
      <div className="px-3 py-2 text-xs font-medium text-gray-500">
        {activeCategory}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-6 gap-1 p-2 max-h-48 overflow-y-auto">
        {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            onClick={() => handleEmojiClick(emoji)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-gray-100 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
