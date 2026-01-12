import { useQuery } from '@tanstack/react-query';
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
