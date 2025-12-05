/**
 * Component Tests for ExportButton
 * Tests UI interactions, accessibility, and export triggers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExportButton from '../ExportButton';
import * as exportService from '../../services/exportService';

// Mock the export service
vi.mock('../../services/exportService', () => ({
  exportAppointments: vi.fn(),
  exportInvoices: vi.fn(),
  exportClients: vi.fn(),
  exportUsers: vi.fn(),
  exportLeaveRequests: vi.fn(),
  exportTimeTracking: vi.fn(),
  downloadFile: vi.fn(),
}));

// Mock the toast context
const mockShowToast = vi.fn();
vi.mock('../../context/useToast', () => ({
  default: () => ({ showToast: mockShowToast }),
}));

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders export button with correct label', () => {
    render(<ExportButton entityType="appointments" />);
    expect(screen.getByText('Exporta')).toBeInTheDocument();
  });

  it('displays download icon', () => {
    render(<ExportButton entityType="appointments" />);
    const button = screen.getByRole('button', { name: /exporta date/i });
    expect(button).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    render(<ExportButton entityType="appointments" />);
    const button = screen.getByRole('button', { name: /exporta date/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });

  it('displays all 4 format options', async () => {
    render(<ExportButton entityType="appointments" />);
    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });
  });

  it('shows format descriptions', async () => {
    render(<ExportButton entityType="appointments" />);
    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));

    await waitFor(() => {
      expect(screen.getByText('Comma Separated Values')).toBeInTheDocument();
      expect(screen.getByText('Microsoft Excel (.xlsx)')).toBeInTheDocument();
      expect(screen.getByText('JavaScript Object Notation')).toBeInTheDocument();
      expect(screen.getByText('Portable Document Format')).toBeInTheDocument();
    });
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <ExportButton entityType="appointments" />
        <div data-testid="outside">Outside</div>
      </div>
    );

    const button = screen.getByRole('button', { name: /exporta date/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('CSV')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown on Escape key', async () => {
    render(<ExportButton entityType="appointments" />);
    const button = screen.getByRole('button', { name: /exporta date/i });

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('CSV')).not.toBeInTheDocument();
    });
  });

  it('triggers CSV export when CSV option clicked', async () => {
    const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
    exportService.exportAppointments.mockResolvedValue(mockBlob);

    render(<ExportButton entityType="appointments" />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(exportService.exportAppointments).toHaveBeenCalledWith('csv', {});
      expect(exportService.downloadFile).toHaveBeenCalled();
    });
  });

  it('triggers Excel export when Excel option clicked', async () => {
    const mockBlob = new Blob(['excel data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    exportService.exportInvoices.mockResolvedValue(mockBlob);

    render(<ExportButton entityType="invoices" />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
    await waitFor(() => screen.getByText('Excel'));

    fireEvent.click(screen.getByText('Excel'));

    await waitFor(() => {
      expect(exportService.exportInvoices).toHaveBeenCalledWith('excel', {});
    });
  });

  it('passes filters to export function', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    exportService.exportClients.mockResolvedValue(mockBlob);

    const filters = { status: 'active', search: 'test' };
    render(<ExportButton entityType="clients" filters={filters} />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
    await waitFor(() => screen.getByText('CSV'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(exportService.exportClients).toHaveBeenCalledWith('csv', filters);
    });
  });

  it('shows loading state during export', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    exportService.exportAppointments.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockBlob), 100))
    );

    render(<ExportButton entityType="appointments" />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
    await waitFor(() => screen.getByText('CSV'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(screen.getByText('Se descarca...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Se descarca...')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('shows success toast after export', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    exportService.exportAppointments.mockResolvedValue(mockBlob);

    render(<ExportButton entityType="appointments" />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
    await waitFor(() => screen.getByText('CSV'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Export complet',
          type: 'success',
        })
      );
    });
  });

  it('shows error toast on export failure', async () => {
    exportService.exportAppointments.mockRejectedValue(new Error('Network error'));

    render(<ExportButton entityType="appointments" />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
    await waitFor(() => screen.getByText('CSV'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Eroare la export',
          type: 'error',
        })
      );
    });
  });

  it('handles 404 error with specific message', async () => {
    exportService.exportAppointments.mockRejectedValue(
      new Error('404: No data found')
    );

    render(<ExportButton entityType="appointments" />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
    await waitFor(() => screen.getByText('CSV'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nu exista date de exportat.',
        })
      );
    });
  });

  it('handles 403 permission error', async () => {
    exportService.exportUsers.mockRejectedValue(
      new Error('403: Forbidden')
    );

    render(<ExportButton entityType="users" />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
    await waitFor(() => screen.getByText('CSV'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Nu ai permisiunea de a exporta aceste date.',
        })
      );
    });
  });

  it('is disabled when disabled prop is true', () => {
    render(<ExportButton entityType="appointments" disabled={true} />);
    const button = screen.getByRole('button', { name: /exporta date/i });
    expect(button).toBeDisabled();
  });

  it('does not open dropdown when disabled', async () => {
    render(<ExportButton entityType="appointments" disabled={true} />);
    const button = screen.getByRole('button', { name: /exporta date/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.queryByText('CSV')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with Enter key', async () => {
    render(<ExportButton entityType="appointments" />);
    const button = screen.getByRole('button', { name: /exporta date/i });

    fireEvent.keyDown(button, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with Space key', async () => {
    render(<ExportButton entityType="appointments" />);
    const button = screen.getByRole('button', { name: /exporta date/i });

    fireEvent.keyDown(button, { key: ' ' });

    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });
  });

  it('generates correct filename with entity label and date', async () => {
    const mockBlob = new Blob(['data'], { type: 'text/csv' });
    exportService.exportAppointments.mockResolvedValue(mockBlob);

    render(<ExportButton entityType="appointments" />);

    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
    await waitFor(() => screen.getByText('CSV'));
    fireEvent.click(screen.getByText('CSV'));

    await waitFor(() => {
      expect(exportService.downloadFile).toHaveBeenCalledWith(
        mockBlob,
        expect.stringMatching(/^programari-\d{4}-\d{2}-\d{2}\.csv$/)
      );
    });
  });

  it('handles different entity types correctly', async () => {
    const entities = [
      { type: 'appointments', fn: exportService.exportAppointments },
      { type: 'invoices', fn: exportService.exportInvoices },
      { type: 'clients', fn: exportService.exportClients },
      { type: 'users', fn: exportService.exportUsers },
      { type: 'leave-requests', fn: exportService.exportLeaveRequests },
      { type: 'time-tracking', fn: exportService.exportTimeTracking },
    ];

    for (const entity of entities) {
      vi.clearAllMocks();
      const mockBlob = new Blob(['data'], { type: 'text/csv' });
      entity.fn.mockResolvedValue(mockBlob);

      const { unmount } = render(<ExportButton entityType={entity.type} />);

      fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));
      await waitFor(() => screen.getByText('CSV'));
      fireEvent.click(screen.getByText('CSV'));

      await waitFor(() => {
        expect(entity.fn).toHaveBeenCalled();
      });

      unmount();
    }
  });

  it('applies custom className', () => {
    render(<ExportButton entityType="appointments" className="custom-class" />);
    const container = screen.getByRole('button', { name: /exporta date/i }).parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('has correct ARIA attributes', () => {
    render(<ExportButton entityType="appointments" />);
    const button = screen.getByRole('button', { name: /exporta date/i });

    expect(button).toHaveAttribute('aria-haspopup', 'true');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-label', 'Exporta date');
  });

  it('updates ARIA expanded when dropdown opens', async () => {
    render(<ExportButton entityType="appointments" />);
    const button = screen.getByRole('button', { name: /exporta date/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('dropdown has correct role', async () => {
    render(<ExportButton entityType="appointments" />);
    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('format options have menuitem role', async () => {
    render(<ExportButton entityType="appointments" />);
    fireEvent.click(screen.getByRole('button', { name: /exporta date/i }));

    await waitFor(() => {
      const menuitems = screen.getAllByRole('menuitem');
      expect(menuitems).toHaveLength(4);
    });
  });
});
