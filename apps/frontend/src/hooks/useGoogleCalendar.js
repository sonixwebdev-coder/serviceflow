import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as googleCalendarService from '../services/googleCalendarService';

/**
 * Hook to get Google Calendar connection status
 */
export const useGoogleCalendarStatus = (options = {}) => {
  return useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: googleCalendarService.getConnectionStatus,
    retry: false,
    ...options,
  });
};

/**
 * Hook to list available Google Calendars
 */
export const useGoogleCalendars = (options = {}) => {
  return useQuery({
    queryKey: ['google-calendars'],
    queryFn: googleCalendarService.listCalendars,
    enabled: false, // Only fetch when explicitly enabled
    retry: false,
    ...options,
  });
};

/**
 * Hook to connect Google Calendar (get OAuth URL)
 * @param {string} returnUrl - URL to redirect to after OAuth
 */
export const useConnectGoogleCalendar = (returnUrl = '/settings') => {
  return useMutation({
    mutationFn: () => googleCalendarService.getConnectUrl(returnUrl),
    onSuccess: (data) => {
      // Redirect to Google OAuth
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    },
  });
};

/**
 * Hook to disconnect Google Calendar
 */
export const useDisconnectGoogleCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: googleCalendarService.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      queryClient.removeQueries({ queryKey: ['google-calendars'] });
    },
  });
};

/**
 * Hook to update Google Calendar settings
 */
export const useUpdateGoogleCalendarSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: googleCalendarService.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
    },
  });
};

/**
 * Hook to sync all appointments to Google Calendar
 */
export const useSyncAllToGoogleCalendar = () => {
  return useMutation({
    mutationFn: googleCalendarService.syncAll,
  });
};

/**
 * Hook to sync a specific appointment to Google Calendar
 */
export const useSyncAppointmentToGoogleCalendar = () => {
  return useMutation({
    mutationFn: googleCalendarService.syncAppointment,
  });
};

/**
 * Hook to import events from Google Calendar to CRM
 */
export const useImportFromGoogleCalendar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: googleCalendarService.importFromGoogle,
    onSuccess: () => {
      // Invalidate appointments query to show newly imported ones
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
    },
  });
};

/**
 * Hook to perform bidirectional sync (export + import)
 */
export const useSyncBidirectional = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: googleCalendarService.syncBidirectional,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
    },
  });
};

export default useGoogleCalendarStatus;
