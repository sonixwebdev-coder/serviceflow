import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchServiceOrder, saveServiceOrder } from '../services/appointmentService';

export const useServiceOrder = (appointmentId) => {
  return useQuery({
    queryKey: ['service-order', appointmentId],
    enabled: Boolean(appointmentId),
    queryFn: () => fetchServiceOrder(appointmentId),
  });
};

export const useSaveServiceOrder = (appointmentId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => saveServiceOrder(appointmentId, payload),
    onSuccess: (data) => {
      if (appointmentId) {
        queryClient.setQueryData(['service-order', appointmentId], data);
      }
      queryClient.invalidateQueries({ queryKey: ['service-order', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['payment-status', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      if (appointmentId) {
        queryClient.setQueryData(['appointment', appointmentId], (current) => {
          if (!current) return current;
          const updatedAssignees = data?.appointment?.assignees || current.assignees;
          return {
            ...current,
            assignees: updatedAssignees,
            serviceOrder: data || current.serviceOrder,
          };
        });
      }
      queryClient.setQueriesData({ queryKey: ['appointments'] }, (current) => {
        if (!Array.isArray(current)) return current;
        return current.map((appointment) => {
          if (appointment.id !== appointmentId) return appointment;
          return {
            ...appointment,
            assignees: data?.appointment?.assignees || appointment.assignees,
            serviceOrder: data || appointment.serviceOrder,
          };
        });
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};
