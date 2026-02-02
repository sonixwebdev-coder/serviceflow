import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService } from '../services/appointmentService';

export function useAppointments(filters = {}) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => appointmentService.getAppointments(filters),
  });
}

export function useAppointment(id) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentService.getAppointment(id),
    enabled: !!id,
  });
}

export function useUpcomingAppointments() {
  return useQuery({
    queryKey: ['upcoming-appointments'],
    queryFn: () => appointmentService.getUpcomingAppointments(),
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => appointmentService.createAppointment(data),
    onSuccess: () => {
      // Invalidate appointments queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-appointments'] });
    },
  });
}
