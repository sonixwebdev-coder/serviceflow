import { useQuery } from '@tanstack/react-query';
import {
  fetchOverview,
  fetchRevenueTrends,
  fetchPaymentTrends,
  fetchAppointmentStats,
  fetchClientAcquisition,
  fetchInvoiceAging,
  fetchTopClients,
  fetchLocationComparison,
} from '../services/analyticsService';

/**
 * Hook for dashboard overview metrics
 */
export function useOverview(options = {}) {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: fetchOverview,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Hook for revenue trends
 * @param {Object} params - { startDate, endDate, groupBy }
 */
export function useRevenueTrends(params = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'revenue', params],
    queryFn: () => fetchRevenueTrends(params),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for payment trends (independent of invoices)
 * @param {Object} params - { startDate, endDate, groupBy }
 */
export function usePaymentTrends(params = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'payments', params],
    queryFn: () => fetchPaymentTrends(params),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for appointment statistics
 * @param {Object} params - { startDate, endDate }
 */
export function useAppointmentStats(params = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'appointments', params],
    queryFn: () => fetchAppointmentStats(params),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for client acquisition metrics
 * @param {Object} params - { startDate, endDate, groupBy }
 */
export function useClientAcquisition(params = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'clients', params],
    queryFn: () => fetchClientAcquisition(params),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for invoice aging report
 */
export function useInvoiceAging(options = {}) {
  return useQuery({
    queryKey: ['analytics', 'invoices', 'aging'],
    queryFn: fetchInvoiceAging,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for top clients by revenue
 * @param {Object} params - { startDate, endDate, limit }
 */
export function useTopClients(params = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'clients', 'top', params],
    queryFn: () => fetchTopClients(params),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook for location comparison analytics (admin/manager only)
 * @param {Object} params - { startDate, endDate }
 * @param {Object} options - Additional query options
 */
export function useLocationComparison(params = {}, options = {}) {
  return useQuery({
    queryKey: ['analytics', 'locations', 'comparison', params],
    queryFn: () => fetchLocationComparison(params),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}
