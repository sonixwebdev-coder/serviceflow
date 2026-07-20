import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
  createInvoiceFromServiceOrder,
  updateInvoice,
  deleteInvoice,
  markInvoiceAsSent,
  markInvoiceAsPaid,
  fetchInvoicesByAppointment,
} from '../services/invoiceService';

const EMPTY_ARRAY = [];

export const useInvoices = (initialFilters = {}, options = {}) => {
  const { enablePagination = false } = options;
  const [page, setPage] = useState(1);
  const [overrides, setFilters] = useState({});

  const queryParams = useMemo(() => {
    const params = { ...initialFilters, ...overrides };
    if (enablePagination) {
      params.page = page;
      params.limit = params.limit || 20;
    }
    return params;
  }, [initialFilters, overrides, page, enablePagination]);

  const queryKey = useMemo(() => ['invoices', queryParams], [queryParams]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchInvoices(queryParams),
  });

  const invoices = useMemo(() => data?.data || EMPTY_ARRAY, [data]);

  return {
    invoices,
    meta: data?.meta || null,
    loading: isLoading,
    error,
    filters: queryParams,
    setFilters,
    page,
    setPage,
    refresh: refetch,
  };
};

export const useInvoice = (invoiceId) => {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: () => fetchInvoiceById(invoiceId),
  });
};

export const useInvoicesByAppointment = (appointmentId) => {
  return useQuery({
    queryKey: ['invoices', 'appointment', appointmentId],
    enabled: Boolean(appointmentId),
    queryFn: () => fetchInvoicesByAppointment(appointmentId),
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceOrderId, applyLoyaltyDiscount, ...rest } = {}) => {
      if (serviceOrderId && Object.keys(rest).length === 0) {
        return createInvoiceFromServiceOrder(serviceOrderId, { applyLoyaltyDiscount });
      }
      return createInvoice({ serviceOrderId, applyLoyaltyDiscount, ...rest });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (data?.appointmentId) {
        queryClient.invalidateQueries({
          queryKey: ['invoices', 'appointment', data.appointmentId],
        });
        queryClient.invalidateQueries({
          queryKey: ['appointment', data.appointmentId],
        });
      }
    },
    onError: (err) => {
      console.error('[Invoice] Create failed:', err.response?.data?.message || err.message);
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }) => updateInvoice(id, payload),
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(['invoice', data.id], data);
        queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (data?.appointmentId) {
        queryClient.invalidateQueries({
          queryKey: ['invoices', 'appointment', data.appointmentId],
        });
      }
    },
    onError: (err) => {
      console.error('[Invoice] Update failed:', err.response?.data?.message || err.message);
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: (_, invoiceId) => {
      queryClient.removeQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'appointment'] });
    },
    onError: (err) => {
      console.error('[Invoice] Delete failed:', err.response?.data?.message || err.message);
    },
  });
};

export const useMarkInvoiceAsSent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markInvoiceAsSent,
    onSuccess: (data) => {
      // Update single invoice cache
      if (data?.id) {
        queryClient.setQueryData(['invoice', data.id], data);
        queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      }

      // Invalidate invoices list
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // Update appointment invoices if appointmentId exists
      if (data?.appointmentId) {
        queryClient.invalidateQueries({
          queryKey: ['invoices', 'appointment', data.appointmentId],
        });
      }
    },
  });
};

export const useMarkInvoiceAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markInvoiceAsPaid,
    onSuccess: (data) => {
      // Update single invoice cache
      if (data?.id) {
        queryClient.setQueryData(['invoice', data.id], data);
        queryClient.invalidateQueries({ queryKey: ['invoice', data.id] });
      }

      // Invalidate invoices list
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // Update appointment invoices if appointmentId exists
      if (data?.appointmentId) {
        queryClient.invalidateQueries({
          queryKey: ['invoices', 'appointment', data.appointmentId],
        });
      }
    },
  });
};

export default useInvoices;
