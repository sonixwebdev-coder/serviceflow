import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '../services/invoiceService';

export function useInvoices(filters = {}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoiceService.getInvoices(filters),
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getInvoice(id),
    enabled: !!id,
  });
}

export function useInvoiceSummary() {
  return useQuery({
    queryKey: ['invoice-summary'],
    queryFn: () => invoiceService.getInvoiceSummary(),
  });
}
