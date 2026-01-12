import { useEffect } from 'react';
import useSearchStore from '../../state/useSearchStore';
import CommandPalette from './CommandPalette';

/**
 * Global search component that handles Ctrl+K keyboard shortcut
 * and renders the command palette
 */
export default function GlobalSearch() {
  const { togglePalette, isOpen } = useSearchStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K to open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        togglePalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette]);

  // Prevent body scroll when palette is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return <CommandPalette />;
}
