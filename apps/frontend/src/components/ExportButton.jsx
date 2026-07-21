import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Code, Loader2 } from 'lucide-react';
import useToast from '../context/useToast';
import useAuth from '../context/useAuth';
import {
  exportAppointments,
  exportInvoices,
  exportClients,
  exportUsers,
  exportLeaveRequests,
  exportTimeTracking,
  downloadFile,
} from '../services/exportService';

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV', icon: FileText, description: 'Comma Separated Values' },
  { value: 'json', label: 'JSON', icon: Code, description: 'JavaScript Object Notation' },
  { value: 'xml', label: 'XML', icon: Code, description: 'Extensible Markup Language' },
];

const EXPORT_FUNCTIONS = {
  appointments: exportAppointments,
  invoices: exportInvoices,
  clients: exportClients,
  users: exportUsers,
  'leave-requests': exportLeaveRequests,
  'time-tracking': exportTimeTracking,
};

const ENTITY_LABELS = {
  appointments: 'programari',
  invoices: 'facturi',
  clients: 'clienti',
  users: 'utilizatori',
  'leave-requests': 'concedii',
  'time-tracking': 'pontaj',
};

/**
 * ExportButton Component
 *
 * A reusable dropdown button for exporting data in various formats (CSV, Excel, JSON, PDF)
 *
 * @param {Object} props
 * @param {string} props.entityType - Type of entity to export ('appointments', 'invoices', 'clients', 'users', 'leave-requests', 'time-tracking')
 * @param {Object} props.filters - Current filters/search parameters from parent page
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.className - Additional CSS classes for the button
 */
const ExportButton = ({ entityType, filters = {}, disabled = false, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState(null);
  const dropdownRef = useRef(null);
  const { showToast } = useToast();
  const { hasRole } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Hooks must run in the same order for every render. Authorization only
  // controls the rendered output, not hook registration.
  if (!hasRole('admin')) {
    return null;
  }

  const handleExport = async (format) => {
    setIsOpen(false);
    setIsExporting(true);
    setExportingFormat(format);

    try {
      const exportFunction = EXPORT_FUNCTIONS[entityType];
      if (!exportFunction) {
        throw new Error(`No export function found for entity type: ${entityType}`);
      }

      const blob = await exportFunction(format, filters);

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      const entityLabel = ENTITY_LABELS[entityType] || entityType;
      const extension = getFileExtension(format);
      const filename = `${entityLabel}-${date}.${extension}`;

      // Download the file
      downloadFile(blob, filename);

      showToast({
        title: 'Export complet',
        description: 'Fisierul a fost descarcat cu succes.',
        type: 'success',
      });
    } catch (error) {
      let errorMessage = 'Nu s-au putut exporta datele.';

      if (error.message?.includes('Network')) {
        errorMessage = 'Eroare de retea. Verifica conexiunea.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Nu exista date de exportat.';
      } else if (error.message?.includes('403')) {
        errorMessage = 'Nu ai permisiunea de a exporta aceste date.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Timpul de asteptare a expirat. Incearca din nou.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast({
        title: 'Eroare la export',
        description: errorMessage,
        type: 'error',
      });
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  };

  const getFileExtension = (format) => {
    switch (format) {
      case 'csv':
        return 'csv';
      case 'excel':
        return 'xlsx';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      default:
        return 'txt';
    }
  };

  const handleToggle = () => {
    if (!disabled && !isExporting) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  const handleOptionKeyDown = (event, format) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleExport(format);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled || isExporting}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Exporta date"
        className={`
          inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2
          text-sm font-medium text-gray-700 shadow-xs transition
          hover:bg-gray-50 hover:border-gray-400
          focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white
          ${isOpen ? 'bg-gray-50 border-gray-400' : ''}
        `}
      >
        {isExporting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Se descarca...</span>
          </>
        ) : (
          <>
            <Download size={16} />
            <span>Exporta</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && !isExporting && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1">
            {FORMAT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isCurrentlyExporting = exportingFormat === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleExport(option.value)}
                  onKeyDown={(e) => handleOptionKeyDown(e, option.value)}
                  disabled={isCurrentlyExporting}
                  role="menuitem"
                  className={`
                    flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm
                    transition
                    hover:bg-gray-50
                    focus:bg-gray-50 focus:outline-hidden
                    disabled:cursor-not-allowed disabled:opacity-50
                  `}
                >
                  {isCurrentlyExporting ? (
                    <Loader2 size={16} className="animate-spin text-primary" />
                  ) : (
                    <Icon size={16} className="text-gray-500" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
