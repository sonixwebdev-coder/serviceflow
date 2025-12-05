import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchInvoices,
  fetchInvoiceById,
  createInvoice,
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
  const [filters, setFilters] = useState(initialFilters);

  const queryParams = useMemo(() => {
    const params = { ...filters };
    if (enablePagination) {
      params.page = page;
      params.limit = filters.limit || 20;
    }
    return params;
  }, [filters, page, enablePagination]);

  const queryKey = useMemo(() => ['invoices', queryParams], [queryParams]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchInvoices(queryParams),
  });

  const invoices = useMemo(() => data?.data || EMPTY_ARRAY, [data]);

  return {
    invoices,
    meta: data?.meta || null,
    loading: isLoading,
    error,
    filters,
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
    mutationFn: createInvoice,
    onSuccess: (data) => {
      // Invalidate invoices list
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      // Update appointment invoices if appointmentId exists
      if (data?.appointmentId) {
        queryClient.invalidateQueries({
          queryKey: ['invoices', 'appointment', data.appointmentId]
        });
        queryClient.invalidateQueries({
          queryKey: ['appointment', data.appointmentId]
        });
      }
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }) => updateInvoice(id, payload),
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
          queryKey: ['invoices', 'appointment', data.appointmentId]
        });
      }
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInvoice,
    onSuccess: (_, invoiceId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['invoice', invoiceId] });

      // Invalidate invoices list
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'appointment'] });
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
          queryKey: ['invoices', 'appointment', data.appointmentId]
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
          queryKey: ['invoices', 'appointment', data.appointmentId]
        });
      }
    },
  });
};

export default useInvoices;
