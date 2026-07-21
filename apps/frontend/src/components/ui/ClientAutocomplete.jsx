import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, Phone, Mail, Package, X, Loader2, CreditCard } from 'lucide-react';
import { useClientSearch } from '../../hooks/useClients';
import { useTerminology } from '../../context/TerminologyContext';

/**
 * ClientAutocomplete - Smart client search component with multi-field search
 *
 * Features:
 * - Searches across: firstName, lastName, phone, email, asset identifier, asset name
 * - Debounced search (300ms)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Auto-fills client and asset data on selection
 * - Shows which field matched
 * - Displays client assets with recent first
 *
 * @param {Object} props
 * @param {Function} props.onClientSelect - Callback when client is selected (client, asset)
 * @param {string} props.placeholder - Input placeholder text
 * @param {string} props.className - Additional CSS classes
 */
const ClientAutocomplete = ({
  onClientSelect,
  placeholder = 'Cauta client...',
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [displayValue, setDisplayValue] = useState('');

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const { assetPlural } = useTerminology();

  // Debounced search query - updates 300ms after user stops typing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch search results
  const { data: clients = [], isLoading, error } = useClientSearch(debouncedQuery);

  // Open dropdown when we have results
  useEffect(() => {
    if (clients.length > 0 && debouncedQuery.length >= 2) {
      setIsOpen(true);
      setSelectedIndex(-1);
    } else if (clients.length === 0 && !isLoading && debouncedQuery.length >= 2) {
      setIsOpen(true); // Show "no results" message
    }
  }, [clients, debouncedQuery, isLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setDisplayValue(value);

    if (value.length < 2) {
      setIsOpen(false);
    }
  };

  const handleClientSelect = useCallback(
    (client) => {
      // Format display value
      const clientName =
        client.type === 'PF'
          ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
          : client.companyName || '';

      setDisplayValue(clientName);
      setSearchQuery('');
      setIsOpen(false);

      // Get most recent asset
      const mostRecentAsset = client.assets && client.assets.length > 0 ? client.assets[0] : null;

      // Callback with client and most recent asset
      if (onClientSelect) {
        onClientSelect(client, mostRecentAsset);
      }
    },
    [onClientSelect]
  );

  const handleKeyDown = (e) => {
    if (!isOpen || clients.length === 0) {
      if (e.key === 'ArrowDown' && searchQuery.length >= 2) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < clients.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && clients[selectedIndex]) {
          handleClientSelect(clients[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setDisplayValue('');
    setDebouncedQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const getClientDisplayName = (client) => {
    if (client.type === 'PF') {
      return `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Nume necunoscut';
    }
    return client.companyName || 'Companie necunoscuta';
  };

  const getMatchLabel = (matchedFields) => {
    if (!matchedFields || matchedFields.length === 0) return null;
    return matchedFields[0].label;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (debouncedQuery.length >= 2 && clients.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          aria-label="Cauta client"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="client-autocomplete-results"
        />

        {/* Loading indicator or clear button */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : displayValue ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Sterge"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="client-autocomplete-results"
          className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="listbox"
        >
          {error ? (
            <div className="px-4 py-3 text-sm text-red-600">
              Eroare la cautare. Va rugam incercati din nou.
            </div>
          ) : clients.length === 0 && !isLoading && debouncedQuery.length >= 2 ? (
            <div className="px-4 py-8 text-center">
              <User className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Niciun client gasit</p>
              <p className="text-xs text-gray-400 mt-1">Incercati un alt termen de cautare</p>
            </div>
          ) : (
            clients.map((client, index) => {
              const isSelected = index === selectedIndex;
              const matchLabel = getMatchLabel(client.matchedFields);

              return (
                <div
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  {/* Client Name */}
                  <div className="flex items-start gap-2 mb-1">
                    <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getClientDisplayName(client)}
                      </p>
                      {client.type === 'SRL' && client.contactName && (
                        <p className="text-xs text-gray-500">Contact: {client.contactName}</p>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex flex-wrap gap-3 ml-6 mb-2">
                    {client.phone && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{client.email}</span>
                      </div>
                    )}
                    {client.fidelityCardSerie && (
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <CreditCard className="h-3 w-3" />
                        <span>{client.fidelityCardSerie}</span>
                      </div>
                    )}
                  </div>

                  {/* Assets */}
                  {client.assets && client.assets.length > 0 && (
                    <div className="ml-6 space-y-1">
                      {client.assets.slice(0, 2).map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center gap-1 text-xs text-gray-600"
                        >
                          <Package className="h-3 w-3" />
                          <span className="font-medium">
                            {asset.identifier || asset.name || 'Fara identificator'}
                          </span>
                          {asset.manufacturer && (
                            <>
                              <span>-</span>
                              <span>
                                {asset.manufacturer} {asset.model}
                              </span>
                            </>
                          )}
                          {asset.year && <span className="text-gray-400">({asset.year})</span>}
                        </div>
                      ))}
                      {client.assets.length > 2 && (
                        <p className="text-xs text-gray-400 ml-4">
                          + {client.assets.length - 2} {assetPlural.toLowerCase()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Match indicator */}
                  {matchLabel && (
                    <div className="ml-6 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-100 text-blue-800">
                        Potrivit: {matchLabel}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ClientAutocomplete;
