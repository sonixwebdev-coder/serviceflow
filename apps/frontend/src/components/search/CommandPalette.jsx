import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Users,
  Calendar,
  FileText,
  ClipboardList,
  User,
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Activity,
  ArrowRight,
  Command,
  Clock,
  UserPlus,
  CalendarPlus,
  FilePlus,
  ClipboardPlus,
  Loader2,
} from 'lucide-react';
import useSearchStore from '../../state/useSearchStore';
import { globalSearch } from '../../services/searchService';

const ICONS = {
  client: Users,
  appointment: Calendar,
  invoice: FileText,
  task: ClipboardList,
  user: User,
  action: ArrowRight,
  navigation: ArrowRight,
  // Navigation icons
  'layout-dashboard': LayoutDashboard,
  users: Users,
  calendar: Calendar,
  'file-text': FileText,
  'clipboard-list': ClipboardList,
  'message-square': MessageSquare,
  'bar-chart': BarChart3,
  activity: Activity,
  // Action icons
  'user-plus': UserPlus,
  'calendar-plus': CalendarPlus,
  'file-plus': FilePlus,
  'clipboard-plus': ClipboardPlus,
};

const TYPE_LABELS = {
  client: 'Clienti',
  appointment: 'Programari',
  invoice: 'Facturi',
  task: 'Task-uri',
  user: 'Utilizatori',
  action: 'Actiuni rapide',
  navigation: 'Navigare',
};

const TYPE_COLORS = {
  client: 'bg-blue-100 text-blue-600',
  appointment: 'bg-green-100 text-green-600',
  invoice: 'bg-purple-100 text-purple-600',
  task: 'bg-orange-100 text-orange-600',
  user: 'bg-gray-100 text-gray-600',
  action: 'bg-viperx-primary/10 text-viperx-primary',
  navigation: 'bg-gray-100 text-gray-600',
};

const QUICK_ACTIONS = [
  { id: 'new-appointment', type: 'action', title: 'Programare noua', icon: 'calendar-plus', url: '/crm/appointments?action=create' },
  { id: 'new-client', type: 'action', title: 'Client nou', icon: 'user-plus', url: '/crm/clients?action=create' },
  { id: 'new-task', type: 'action', title: 'Task nou', icon: 'clipboard-plus', url: '/tasks?action=create' },
  { id: 'new-invoice', type: 'action', title: 'Factura noua', icon: 'file-plus', url: '/crm/invoices?action=create' },
];

const NAVIGATION = [
  { id: 'nav-dashboard', type: 'navigation', title: 'Tablou de bord', icon: 'layout-dashboard', url: '/dashboard' },
  { id: 'nav-clients', type: 'navigation', title: 'Clienti', icon: 'users', url: '/crm/clients' },
  { id: 'nav-appointments', type: 'navigation', title: 'Programari', icon: 'calendar', url: '/crm/appointments' },
  { id: 'nav-invoices', type: 'navigation', title: 'Facturi', icon: 'file-text', url: '/crm/invoices' },
  { id: 'nav-tasks', type: 'navigation', title: 'Task-uri', icon: 'clipboard-list', url: '/tasks' },
  { id: 'nav-chat', type: 'navigation', title: 'Chat', icon: 'message-square', url: '/chat' },
  { id: 'nav-analytics', type: 'navigation', title: 'Statistici', icon: 'bar-chart', url: '/analytics' },
  { id: 'nav-activity', type: 'navigation', title: 'Activitate', icon: 'activity', url: '/activity' },
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const {
    isOpen,
    query,
    selectedIndex,
    recentSearches,
    closePalette,
    setQuery,
    setSelectedIndex,
    moveSelectionUp,
    moveSelectionDown,
    addRecentSearch,
  } = useSearchStore();

  const [results, setResults] = useState({ results: {} });
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  // Flatten results for keyboard navigation
  const allItems = useCallback(() => {
    const items = [];

    // If no query, show quick actions and navigation
    if (!query.trim()) {
      if (recentSearches.length > 0) {
        items.push(...recentSearches.map((item) => ({ ...item, section: 'recent' })));
      }
      items.push(...QUICK_ACTIONS.map((item) => ({ ...item, section: 'actions' })));
      items.push(...NAVIGATION.map((item) => ({ ...item, section: 'navigation' })));
      return items;
    }

    // Add search results
    const resultTypes = ['clients', 'appointments', 'tasks', 'invoices', 'users'];
    resultTypes.forEach((type) => {
      const typeResults = results.results?.[type] || [];
      items.push(...typeResults.map((item) => ({ ...item, section: type })));
    });

    return items;
  }, [query, results, recentSearches]);

  const items = allItems();

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ results: {} });
      return;
    }

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await globalSearch(query, { limit: 5 });
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelectionDown(items.length - 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelectionUp();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = items[selectedIndex];
        if (selectedItem) {
          handleSelect(selectedItem);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePalette();
      }
    },
    [items, selectedIndex, moveSelectionDown, moveSelectionUp, closePalette]
  );

  // Handle item selection
  const handleSelect = (item) => {
    if (item.url) {
      // Add to recent searches if it's a search result
      if (['client', 'appointment', 'task', 'invoice', 'user'].includes(item.type)) {
        addRecentSearch(item);
      }
      navigate(item.url);
      closePalette();
    }
  };

  // Close on overlay click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      closePalette();
    }
  };

  if (!isOpen) return null;

  // Group items by section
  const groupedItems = {};
  let currentIndex = 0;
  items.forEach((item) => {
    const section = item.section || item.type;
    if (!groupedItems[section]) {
      groupedItems[section] = [];
    }
    groupedItems[section].push({ ...item, flatIndex: currentIndex });
    currentIndex++;
  });

  const getSectionTitle = (section) => {
    if (section === 'recent') return 'Cautari recente';
    if (section === 'actions') return 'Actiuni rapide';
    if (section === 'navigation') return 'Navigare';
    return TYPE_LABELS[section] || section;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[15vh]"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Cauta clienti, programari, task-uri..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-lg outline-none placeholder-gray-400"
          />
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded">
              ESC
            </kbd>
            <button
              onClick={closePalette}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 && query.trim() && !isLoading ? (
            <div className="py-8 text-center text-gray-500">
              <Search className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>Niciun rezultat pentru &quot;{query}&quot;</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([section, sectionItems]) => (
              <div key={section}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                  {getSectionTitle(section)}
                </div>
                {sectionItems.map((item) => {
                  const IconComponent = ICONS[item.icon] || ICONS[item.type] || ArrowRight;
                  const isSelected = item.flatIndex === selectedIndex;

                  return (
                    <button
                      key={item.id}
                      data-index={item.flatIndex}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                        isSelected ? 'bg-viperx-primary/5' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${TYPE_COLORS[item.type] || 'bg-gray-100'}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-sm text-gray-500 truncate">{item.subtitle}</p>
                        )}
                      </div>
                      {isSelected && (
                        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                          Enter
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">↓</kbd>
              navigare
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded">Enter</kbd>
              selectare
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K pentru deschidere
          </span>
        </div>
      </div>
    </div>
  );
}
