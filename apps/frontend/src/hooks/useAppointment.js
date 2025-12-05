import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAppointmentById,
  updateAppointment,
  cancelAppointment,
} from '../services/appointmentService';

export const useAppointment = (appointmentId, options = {}) => {
  return useQuery({
    queryKey: ['appointment', appointmentId],
    enabled: Boolean(appointmentId) && options.enabled !== false,
    queryFn: () => fetchAppointmentById(appointmentId),
  });
};

export const useUpdateAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, payload }) => updateAppointment(appointmentId, payload),
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(['appointment', data.id], data);
        queryClient.setQueriesData({ queryKey: ['appointments'] }, (current) => {
          if (!Array.isArray(current)) return current;
          return current.map((appointment) => (appointment.id === data.id ? { ...appointment, ...data } : appointment));
        });
        if (data.serviceOrder) {
          queryClient.setQueryData(['service-order', data.id], data.serviceOrder);
        }
        queryClient.invalidateQueries({ queryKey: ['service-order', data.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['appointment', data.id] });
      }
    },
  });
};

export const useCancelAppointment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, reason }) => cancelAppointment(appointmentId, reason),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      if (variables?.appointmentId) {
        queryClient.invalidateQueries({ queryKey: ['appointment', variables.appointmentId] });
      }
    },
  });
};
