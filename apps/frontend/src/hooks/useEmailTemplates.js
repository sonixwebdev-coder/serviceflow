import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as emailTemplateService from '../services/emailTemplateService';

/**
 * Hook to get all email templates
 */
export const useEmailTemplates = (options = {}) => {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: emailTemplateService.getTemplates,
    ...options,
  });
};

/**
 * Hook to get a specific email template
 * @param {string} name - Template name
 */
export const useEmailTemplate = (name, options = {}) => {
  return useQuery({
    queryKey: ['email-template', name],
    queryFn: () => emailTemplateService.getTemplate(name),
    enabled: Boolean(name),
    ...options,
  });
};

/**
 * Hook to update an email template
 */
export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }) => emailTemplateService.updateTemplate(name, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['email-template', variables.name] });
    },
  });
};

/**
 * Hook to send a test email
 */
export const useSendTestEmail = () => {
  return useMutation({
    mutationFn: ({ templateName, toEmail }) =>
      emailTemplateService.sendTestEmail(templateName, toEmail),
  });
};

/**
 * Hook to get email logs
 * @param {Object} params - Query parameters
 */
export const useEmailLogs = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['email-logs', params],
    queryFn: () => emailTemplateService.getEmailLogs(params),
    ...options,
  });
};

/**
 * Hook to resend a failed email
 */
export const useResendEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailTemplateService.resendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-logs'] });
    },
  });
};

export default useEmailTemplates;
