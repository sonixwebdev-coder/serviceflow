import { create } from 'zustand';

const useSearchStore = create((set) => ({
  // Command palette state
  isOpen: false,
  query: '',
  selectedIndex: 0,
  recentSearches: JSON.parse(localStorage.getItem('recentSearches') || '[]'),

  // Actions
  openPalette: () => set({ isOpen: true, query: '', selectedIndex: 0 }),
  closePalette: () => set({ isOpen: false, query: '', selectedIndex: 0 }),
  togglePalette: () => set((state) => ({ isOpen: !state.isOpen, query: '', selectedIndex: 0 })),

  setQuery: (query) => set({ query, selectedIndex: 0 }),
  setSelectedIndex: (selectedIndex) => set({ selectedIndex }),

  moveSelectionUp: () =>
    set((state) => ({
      selectedIndex: Math.max(0, state.selectedIndex - 1),
    })),

  moveSelectionDown: (maxIndex) =>
    set((state) => ({
      selectedIndex: Math.min(maxIndex, state.selectedIndex + 1),
    })),

  addRecentSearch: (item) =>
    set((state) => {
      const existing = state.recentSearches.filter((s) => s.id !== item.id);
      const updated = [item, ...existing].slice(0, 5);
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      return { recentSearches: updated };
    }),

  clearRecentSearches: () => {
    localStorage.removeItem('recentSearches');
    set({ recentSearches: [] });
  },
}));

export default useSearchStore;
