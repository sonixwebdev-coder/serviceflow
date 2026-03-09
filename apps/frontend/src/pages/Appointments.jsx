import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confirm from '../utils/confirm';
import { MessageSquare, X, Send, Plus, Trash2, FileText, CheckCircle2, Clock, AlertCircle, Edit2, Save, Cloud, CloudOff, Paperclip, Play, Pause, Download, Image as ImageIcon, User } from 'lucide-react';
import { format, isBefore, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parse, getDay } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAppointments } from '../hooks/useAppointments.js';
import { useAppointment, useCancelAppointment, useUpdateAppointment } from '../hooks/useAppointment.js';
import { useAppointmentMessages } from '../hooks/useAppointmentMessages.js';
import { useServiceOrder, useSaveServiceOrder } from '../hooks/useServiceOrder.js';
import { useCreateInvoice } from '../hooks/useInvoices.js';
import useUsers from '../hooks/useUsers.js';
import { useCompanySettings } from '../hooks/useCompanySettings.js';
import DatePicker from '../components/ui/DatePicker.jsx';
import ClientAutocomplete from '../components/ui/ClientAutocomplete.jsx';
import TimePicker from '../components/ui/TimePicker.jsx';

import ExportButton from '../components/ExportButton.jsx';
import DynamicAssetFields from '../components/DynamicAssetFields';
import LocationBadge from '../components/LocationBadge';
import MonthEvent from '../components/appointments/MonthEvent';
import VoiceRecorder from '../components/appointments/VoiceRecorder';
import {
  STATUS_FILTERS, STATUS_META, STATUS_LABELS, STATUS_SEQUENCE,
  PAYMENT_STATUS_META, STATUS_DOT_COLORS,
  HARDWARE_UNITS, LABOR_UNITS, TIME_OPTIONS,
  defaultForm, defaultClientForm, defaultAssetForm, createDefaultOrderDraft,
  getStatusMeta, getPaymentStatusMeta, normalizeRoleKey, extractRoleKeys,
  combineDateAndTime, currencyFormatter, numberFormatter,
} from '../components/appointments/constants';
import useToast from '../context/useToast';
import useAuth from '../context/useAuth';
import { useTerminology } from '../context/TerminologyContext';
import { USER_ROLES } from '../utils/constants.js';
import { getErrorMessage } from '../utils/errorUtils.js';
import { createAppointment, downloadServiceOrderPdf } from '../services/appointmentService';
import { getPaymentStatus, getAppointmentPayments, createPayment, deletePayment } from '../services/paymentService';
import { getSyncStatus as getGoogleSyncStatus } from '../services/googleCalendarService';
import API, { getFileUrl } from '../utils/api.js';
import { getSocket } from '../lib/socket.js';
import { useClientLoyalty, useLoyaltyProgram } from '../hooks/useLoyalty';

const formatDateTime = (value, pattern = 'Pp') =>
  value ? format(new Date(value), pattern, { locale: roDateLocale }) : '';

// Configure React Big Calendar localizer
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: roDateLocale }),
  getDay,
  locales: {
    'ro': roDateLocale,
  },
});

const Appointments = () => {
  const [status, setStatus] = useState();
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [selectedClientId, setSelectedClientId] = useState();
  const [selectedAssigneeId, setSelectedAssigneeId] = useState();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formState, setFormState] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState([]);
  const [clientForm, setClientForm] = useState(defaultClientForm);
  const [assetForm, setAssetForm] = useState(defaultAssetForm);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showManualClientEntry, setShowManualClientEntry] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [orderDraft, setOrderDraft] = useState(createDefaultOrderDraft);

  // Calendar state
  const [calendarView, setCalendarView] = useState('week');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Compute visible date range for on-demand loading
  const calendarRange = useMemo(() => {
    const opts = { weekStartsOn: 1 };
    switch (calendarView) {
      case 'month': {
        const ms = startOfMonth(calendarDate);
        const me = endOfMonth(calendarDate);
        return {
          from: startOfWeek(ms, opts).toISOString(),
          to: endOfWeek(me, opts).toISOString(),
        };
      }
      case 'week':
        return {
          from: startOfWeek(calendarDate, opts).toISOString(),
          to: endOfWeek(calendarDate, opts).toISOString(),
        };
      case 'day':
        return {
          from: startOfDay(calendarDate).toISOString(),
          to: endOfDay(calendarDate).toISOString(),
        };
      default:
        return {};
    }
  }, [calendarView, calendarDate]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type } for modal preview
  const [pendingFile, setPendingFile] = useState(null); // File object for preview before sending
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [applyLoyaltyDiscount, setApplyLoyaltyDiscount] = useState(true);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CASH',
    notes: '',
    reference: '',
  });
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(false);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [editForm, setEditForm] = useState({});
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { assetSingular, assetPlural, features, assetType: sectorAssetType } = useTerminology();
  const hasAssets = features?.useAssets !== false; // Default to true if undefined
  const modalRef = useRef(null);
  const pendingPdfWindowRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const resetCreateForm = useCallback(() => {
    setFormState(defaultForm);
    setClientForm(defaultClientForm);
    setAssetForm(defaultAssetForm);
    setOrderDraft(createDefaultOrderDraft());
    setFormErrors([]);
    setSelectedClient(null);
    setSelectedAsset(null);
    setShowManualClientEntry(false);
  }, []);

  /**
   * Handle client selection from autocomplete
   */
  const handleClientSelect = useCallback((client, asset) => {
    setSelectedClient(client);
    setSelectedAsset(asset);
    setShowManualClientEntry(false);

    // Update form state with client and asset IDs
    setFormState(prev => ({
      ...prev,
      clientId: client.id,
      assetId: asset?.id || '',
    }));

    // Auto-fill client form
    setClientForm({
      type: client.type || 'PF',
      firstName: client.firstName || '',
      lastName: client.lastName || '',
      companyName: client.companyName || '',
      contactName: client.contactName || '',
      phone: client.phone || '',
      email: client.email || '',
      vatNumber: client.vatNumber || '',
      registrationNumber: client.registrationNumber || '',
      notes: client.notes || '',
      fidelityCardSerie: client.fidelityCardSerie || '',
    });

    // Auto-fill asset form with selected asset (most recent by default)
    if (asset) {
      // Reconstruct metadata from both asset.metadata and top-level fields
      const reconstructedMetadata = {
        ...(asset.metadata || {}),
      };

      // Add top-level fields to metadata based on asset type
      if (asset.manufacturer) {
        // For vehicles, use 'make', for others use 'brand'
        if (asset.type === 'vehicle') {
          reconstructedMetadata.make = asset.manufacturer;
        } else {
          reconstructedMetadata.brand = asset.manufacturer;
        }
      }
      if (asset.model) reconstructedMetadata.model = asset.model;
      if (asset.year) reconstructedMetadata.year = asset.year;
      if (asset.identifier) {
        // For vehicles, use 'plateNumber', for others use 'serialNumber'
        if (asset.type === 'vehicle') {
          reconstructedMetadata.plateNumber = asset.identifier;
        } else {
          reconstructedMetadata.serialNumber = asset.identifier;
        }
      }

      setAssetForm({
        assetType: asset.type || sectorAssetType,
        metadata: reconstructedMetadata,
        notes: asset.notes || '',
      });
    }
  }, []);

  /**
   * Handle asset selection from dropdown
   */
  const handleAssetSelect = useCallback((assetId) => {
    if (!selectedClient || !selectedClient.assets) return;

    if (assetId === 'new') {
      // Clear asset form for new asset entry
      setAssetForm(defaultAssetForm);
      setSelectedAsset(null);
      setFormState(prev => ({ ...prev, assetId: '' }));
      return;
    }

    const asset = selectedClient.assets.find(a => a.id === assetId);
    if (asset) {
      setSelectedAsset(asset);
      setFormState(prev => ({ ...prev, assetId: asset.id }));

      // Reconstruct metadata from both asset.metadata and top-level fields
      const reconstructedMetadata = {
        ...(asset.metadata || {}),
      };

      // Add top-level fields to metadata based on asset type
      if (asset.manufacturer) {
        // For vehicles, use 'make', for others use 'brand'
        if (asset.type === 'vehicle') {
          reconstructedMetadata.make = asset.manufacturer;
        } else {
          reconstructedMetadata.brand = asset.manufacturer;
        }
      }
      if (asset.model) reconstructedMetadata.model = asset.model;
      if (asset.year) reconstructedMetadata.year = asset.year;
      if (asset.identifier) {
        // For vehicles, use 'plateNumber', for others use 'serialNumber'
        if (asset.type === 'vehicle') {
          reconstructedMetadata.plateNumber = asset.identifier;
        } else {
          reconstructedMetadata.serialNumber = asset.identifier;
        }
      }

      setAssetForm({
        assetType: asset.type || sectorAssetType,
        metadata: reconstructedMetadata,
        notes: asset.notes || '',
      });
    }
  }, [selectedClient]);

  /**
   * Fetches unread message count for the selected appointment
   */
  const fetchUnreadCount = useCallback(async (appointmentId) => {
    if (!appointmentId) return;
    try {
      const response = await API.get(`/appointments/${appointmentId}/messages/unread-count`);
      const count = response.data?.data?.count ?? response.data?.count ?? 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  /**
   * Fetches payment status for the selected appointment
   */
  const fetchPaymentStatus = useCallback(async (appointmentId) => {
    if (!appointmentId) return;
    setIsLoadingPaymentStatus(true);
    try {
      const status = await getPaymentStatus(appointmentId);
      setPaymentStatus(status);
    } catch (error) {
      console.error('Failed to fetch payment status:', error);
      setPaymentStatus(null);
    } finally {
      setIsLoadingPaymentStatus(false);
    }
  }, []);

  /**
   * Fetches all payments for the selected appointment
   */
  const fetchPayments = useCallback(async (appointmentId) => {
    if (!appointmentId) return;

    setIsLoadingPayments(true);
    try {
      const paymentsData = await getAppointmentPayments(appointmentId);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      setPayments([]);
    } finally {
      setIsLoadingPayments(false);
    }
  }, []);

  /**
   * Marks all messages as read for the selected appointment
   */
  const markMessagesAsRead = useCallback(async (appointmentId) => {
    if (!appointmentId) return;
    try {
      await API.post(`/appointments/${appointmentId}/messages/mark-read`);
      setUnreadCount(0);
      // Refetch to confirm the count is correct
      await fetchUnreadCount(appointmentId);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [fetchUnreadCount]);

  /**
   * Sends typing indicator status to the server
   */
  const sendTypingStatus = useCallback(async (appointmentId, isTyping) => {
    if (!appointmentId) return;
    try {
      await API.post(`/appointments/${appointmentId}/messages/typing`, { isTyping });
    } catch (error) {
      console.error('Failed to send typing status:', error);
    }
  }, []);

  const { hasRole } = useAuth();
  const isAdmin = hasRole(USER_ROLES.ADMIN);
  const calendarParams = useMemo(() => ({ ...calendarRange, fields: 'calendar' }), [calendarRange]);
  const { data: allAppointments = [], loading: isLoading } = useAppointments(calendarParams);
  const { users: employees } = useUsers({}, { enabled: true });
  const { data: companySettings } = useCompanySettings();
  const assigneeOptions = useMemo(() => {
    if (!Array.isArray(employees)) {
      return [];
    }
    if (isAdmin) {
      return employees;
    }
    return employees.filter((employee) => extractRoleKeys(employee).has(USER_ROLES.TECHNICIAN));
  }, [employees, isAdmin]);

  const uniqueClients = useMemo(() => {
    const clientsMap = new Map();
    allAppointments.forEach((appointment) => {
      if (appointment.client && appointment.clientId) {
        clientsMap.set(appointment.clientId, appointment.client);
      }
    });
    return Array.from(clientsMap.values());
  }, [allAppointments]);

  useEffect(() => {
    if (isAdmin) return;
    const allowedIds = new Set(assigneeOptions.map((employee) => employee.id || employee._id));
    setFormState((prev) => {
      if (!prev.assigneeIds?.length) return prev;
      const filtered = prev.assigneeIds.filter((id) => allowedIds.has(id));
      if (filtered.length === prev.assigneeIds.length) {
        return prev;
      }
      return { ...prev, assigneeIds: filtered };
    });
  }, [isAdmin, assigneeOptions]);

  const openCreateModal = (presetDate = new Date()) => {
    resetCreateForm();
    const today = startOfDay(new Date());
    const normalizedDate = startOfDay(presetDate);
    const initialDate = isBefore(normalizedDate, today) ? today : normalizedDate;
    setFormState({
      ...defaultForm,
      scheduledDate: initialDate,
    });
    setIsCreateOpen(true);
  };
  const { data: selectedAppointment } = useAppointment(selectedAppointmentId, { enabled: Boolean(selectedAppointmentId) });

  // Google Calendar sync status
  const { data: googleSyncStatus } = useQuery({
    queryKey: ['google-sync-status', selectedAppointmentId],
    queryFn: () => getGoogleSyncStatus(selectedAppointmentId),
    enabled: Boolean(selectedAppointmentId),
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  const { messages, sending, sendMessage, loading: messagesLoading, uploadFile, uploadingFile, uploadVoice, uploadingVoice } = useAppointmentMessages(selectedAppointmentId || undefined);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages?.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const { data: serviceOrder, isLoading: orderLoading } = useServiceOrder(selectedAppointmentId || undefined);
  const saveOrderMutation = useSaveServiceOrder(selectedAppointmentId || undefined);
  const cancelMutation = useCancelAppointment();
  const updateMutation = useUpdateAppointment();
  const createInvoiceMutation = useCreateInvoice();

  // Loyalty discount info — fetch whenever an appointment is selected (used for invoice creation and payment modal)
  const { data: loyaltyAccount } = useClientLoyalty(selectedAppointment?.clientId ?? null);
  const { data: loyaltyProgram } = useLoyaltyProgram();

  const getLoyaltyDiscountPercent = () => {
    if (!loyaltyAccount || !loyaltyProgram || !loyaltyProgram.isEnabled) return 0;
    const discountMap = {
      BRONZE: Number(loyaltyProgram.bronzeDiscount || 0),
      SILVER: Number(loyaltyProgram.silverDiscount || 0),
      GOLD: Number(loyaltyProgram.goldDiscount || 0),
      PLATINUM: Number(loyaltyProgram.platinumDiscount || 0),
    };
    return discountMap[loyaltyAccount.currentTier] || 0;
  };

  const handleStatusChange = useCallback(
    (nextStatus) => {
      if (!selectedAppointmentId || !nextStatus) return;

      // Prevent changing status of completed appointments
      if (selectedAppointment?.status === 'COMPLETED') {
        showToast({
          title: 'Programarea este finalizata',
          description: 'Nu se pot face modificari la programarile finalizate.',
          type: 'warning',
        });
        return;
      }

      const normalized = nextStatus.toString().toUpperCase();
      if (selectedAppointment?.status === normalized) return;

      // Prevent status updates while a request is in progress
      if (updateMutation.isPending) {
        return;
      }

      updateMutation.mutate(
        { appointmentId: selectedAppointmentId, payload: { status: normalized } },
        {
          onSuccess: () => {
            const statusLabel = getStatusMeta(normalized).label;
            showToast({ title: `Status schimbat in: ${statusLabel}`, type: 'success' });
          },
          onError: (error) => {
            console.error('Failed to update appointment status', error);
            showToast({
              title: 'Nu am putut actualiza statusul',
              description: error?.message || 'Incearca din nou.',
              type: 'error',
            });
          },
        }
      );
    },
    [selectedAppointmentId, selectedAppointment?.status, updateMutation, showToast]
  );

  const startEditingAppointment = useCallback(() => {
    if (!selectedAppointment) return;

    setEditForm({
      title: selectedAppointment.title || '',
      description: selectedAppointment.description || '',
      scheduledDate: selectedAppointment.scheduledStart ? new Date(selectedAppointment.scheduledStart) : null,
      startTime: selectedAppointment.scheduledStart
        ? format(new Date(selectedAppointment.scheduledStart), 'HH:mm')
        : '',
      endTime: selectedAppointment.scheduledEnd
        ? format(new Date(selectedAppointment.scheduledEnd), 'HH:mm')
        : '',
      assigneeIds: selectedAppointment.assignees?.map(a => a.userId) || [],
      location: selectedAppointment.location || '',
    });
    setIsEditingAppointment(true);
  }, [selectedAppointment]);

  const cancelEditingAppointment = useCallback(() => {
    setIsEditingAppointment(false);
    setEditForm({});
  }, []);

  const handleSaveAppointment = useCallback(async () => {
    if (!selectedAppointmentId || !editForm.scheduledDate) return;

    const [startHours, startMinutes] = editForm.startTime.split(':').map(Number);
    const [endHours, endMinutes] = editForm.endTime.split(':').map(Number);

    const scheduledStart = new Date(editForm.scheduledDate);
    scheduledStart.setHours(startHours, startMinutes, 0, 0);

    const scheduledEnd = new Date(editForm.scheduledDate);
    scheduledEnd.setHours(endHours, endMinutes, 0, 0);

    if (scheduledEnd <= scheduledStart) {
      showToast({
        title: 'Eroare validare',
        description: 'Ora de final trebuie sa fie dupa ora de inceput',
        type: 'error',
      });
      return;
    }

    const payload = {
      title: editForm.title,
      scheduledStart: scheduledStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      assigneeIds: editForm.assigneeIds,
    };

    // Only include optional fields if they have values
    if (editForm.description) {
      payload.description = editForm.description;
    }
    if (editForm.location) {
      payload.location = editForm.location;
    }

    updateMutation.mutate(
      { appointmentId: selectedAppointmentId, payload },
      {
        onSuccess: () => {
          setIsEditingAppointment(false);
          showToast({ title: 'Programare actualizata', type: 'success' });
        },
      }
    );
  }, [selectedAppointmentId, editForm, updateMutation, showToast]);

  const previewPdfMutation = useMutation({
    mutationFn: ({ appointmentId, refresh }) => downloadServiceOrderPdf(appointmentId, { refresh }),
    onSuccess: (result, variables) => {
      const blobUrl = window.URL.createObjectURL(result.blob);
      const targetWindow = variables?.pdfWindow && !variables.pdfWindow.closed
        ? variables.pdfWindow
        : pendingPdfWindowRef.current && !pendingPdfWindowRef.current.closed
          ? pendingPdfWindowRef.current
          : null;
      if (targetWindow) {
        targetWindow.location.href = blobUrl;
      } else {
        // Open PDF in new browser tab (not popup)
        window.open(blobUrl, '_blank');
      }
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000);
      showToast({ title: 'PDF generat', type: 'success' });
      if (variables?.appointmentId && (!serviceOrder?.pdfUrl || variables.refresh)) {
        queryClient.invalidateQueries({ queryKey: ['service-order', variables.appointmentId] });
      }
      pendingPdfWindowRef.current = null;
    },
    onError: (error, variables) => {
      const targetWindow = variables?.pdfWindow && !variables.pdfWindow.closed
        ? variables.pdfWindow
        : pendingPdfWindowRef.current && !pendingPdfWindowRef.current.closed
          ? pendingPdfWindowRef.current
          : null;
      if (targetWindow) {
        targetWindow.close();
      }
      pendingPdfWindowRef.current = null;
      console.error('Failed to generate service order PDF', error);
      showToast({
        title: 'Generarea PDF-ului a esuat',
        description: 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    },
  });

const createMutation = useMutation({
    mutationFn: (payload) => createAppointment(payload),
    onSuccess: async (data) => {
      showToast({ title: 'Programarea a fost creata', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      resetCreateForm();
      setIsCreateOpen(false);
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['appointment', data.id] });
        queryClient.invalidateQueries({ queryKey: ['service-order', data.id] });
        setSelectedAppointmentId(data.id);
        setActiveTab('details');

        // Generate and open PDF automatically
        (async () => {
          try {
            const { blob: pdfBlob } = await downloadServiceOrderPdf(data.id, { refresh: true });
            const pdfUrl = window.URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 60000);
          } catch (error) {
            console.error('Error opening PDF:', error);
          }
        })();
      }
    },
    onError: (error) => {
      showToast({
        title: 'Nu am putut salva programarea',
        description: 'Verifica datele introduse si incearca din nou.',
        type: 'error',
      });
    },
});

  const isSaving = createMutation.isPending;

  const closeCreateModal = useCallback(
    async (requireConfirm = false) => {
      if (isSaving) {
        return;
      }
      if (requireConfirm) {
        const confirmed = await confirm({ title: 'Inchide formular', text: 'Datele completate vor fi pierdute. Sigur vrei sa inchizi?', confirmText: 'Inchide', danger: false });
        if (!confirmed) {
          return;
        }
      }
      resetCreateForm();
      setIsCreateOpen(false);
    },
    [isSaving, resetCreateForm]
  );

useEffect(() => {
  if (!selectedAppointmentId) {
    setIsEditingOrder(false);
  }
}, [selectedAppointmentId]);

useEffect(() => {
  if (!isCreateOpen || isSaving) return;
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCreateModal(true);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isCreateOpen, isSaving, closeCreateModal]);

  useEffect(() => {
    if (serviceOrder) {
      setOrderDraft({
        notes: serviceOrder.notes || '',
        lineItems: serviceOrder.lineItems?.length
          ? serviceOrder.lineItems.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description || '',
              hardwareQuantity: item.hardwareQuantity !== null && item.hardwareQuantity !== undefined ? item.hardwareQuantity : (item.quantity || 1),
              laborQuantity: item.laborQuantity !== null && item.laborQuantity !== undefined ? item.laborQuantity : (item.quantity || 1),
              // Use the enhanced fields if available, otherwise fallback to legacy unitPrice (put in labor)
              hardwarePrice: item.hardwarePrice !== undefined && item.hardwarePrice !== null ? item.hardwarePrice : 0,
              laborPrice: item.laborPrice !== undefined && item.laborPrice !== null ? item.laborPrice : (item.unitPrice || 0),
              hardwareUnit: item.hardwareUnit || '',
              laborUnit: item.laborUnit || '',
            }))
          : [{ name: '', description: '', hardwareQuantity: 1, laborQuantity: 1, hardwarePrice: 0, laborPrice: 0, hardwareUnit: '', laborUnit: '' }],
      });
    } else {
      setOrderDraft(createDefaultOrderDraft());
    }
  }, [serviceOrder, selectedAppointmentId]);

  /**
   * Fetch unread count, payment status, and payments when appointment drawer opens
   */
  useEffect(() => {
    if (selectedAppointmentId) {
      fetchUnreadCount(selectedAppointmentId);
      fetchPaymentStatus(selectedAppointmentId);
      fetchPayments(selectedAppointmentId);
    } else {
      setUnreadCount(0);
      setTypingUsers(new Map());
      setPaymentStatus(null);
      setPayments([]);
    }
  }, [selectedAppointmentId, fetchUnreadCount, fetchPaymentStatus, fetchPayments]);

  /**
   * Mark messages as read when switching to messages tab
   */
  useEffect(() => {
    if (selectedAppointmentId && activeTab === 'messages' && unreadCount > 0) {
      markMessagesAsRead(selectedAppointmentId);
    }
  }, [selectedAppointmentId, activeTab, unreadCount, markMessagesAsRead]);

  /**
   * Socket integration for real-time messaging features
   */
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedAppointmentId) return;

    /**
     * Handle new message event - update unread count if not in messages tab
     */
    const handleNewMessage = (message) => {
      if (message?.appointmentId === selectedAppointmentId) {
        // Only increment unread count if not in messages tab and message is from another user
        if (activeTab !== 'messages' && message.authorId !== user?.id) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    };

    /**
     * Handle typing indicator event
     */
    const handleTyping = (data) => {
      const typingUserId = data?.user?.id || data?.user?._id;
      const currentUserId = user?.id || user?._id;

      // Don't show typing indicator for current user
      if (data?.appointmentId === selectedAppointmentId && typingUserId && typingUserId !== currentUserId) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (data.isTyping) {
            next.set(typingUserId, {
              firstName: data.user?.firstName || '',
              lastName: data.user?.lastName || '',
              timestamp: Date.now(),
            });
          } else {
            next.delete(typingUserId);
          }
          return next;
        });

        // Auto-clear typing indicator after 5 seconds
        if (data.isTyping) {
          setTimeout(() => {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              const entry = next.get(data.userId);
              if (entry && Date.now() - entry.timestamp > 4500) {
                next.delete(data.userId);
              }
              return next;
            });
          }, 5000);
        }
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:typing', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:typing', handleTyping);
    };
  }, [selectedAppointmentId, activeTab, user, fetchUnreadCount]);

  /**
   * Handle typing in message input with debouncing
   */
  const handleMessageInputChange = useCallback((value) => {
    setMessageDraft(value);
    setSendError(null);

    if (!selectedAppointmentId) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing=true immediately when user starts typing
    if (value.trim().length > 0) {
      sendTypingStatus(selectedAppointmentId, true);

      // Auto-stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(selectedAppointmentId, false);
      }, 3000);
    } else {
      // Send typing=false when input is cleared
      sendTypingStatus(selectedAppointmentId, false);
    }
  }, [selectedAppointmentId, sendTypingStatus]);

  /**
   * Cleanup typing timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const orderTotals = useMemo(() => {
    const subtotal =
      orderDraft.lineItems?.reduce((sum, item) => {
        const hardwareQty = Number(item.hardwareQuantity) || 0;
        const laborQty = Number(item.laborQuantity) || 0;
        const hardware = Number(item.hardwarePrice) || 0;
        const labor = Number(item.laborPrice) || 0;
        return sum + (hardwareQty * hardware) + (laborQty * labor);
      }, 0) || 0;
    return { subtotal, total: subtotal };
  }, [orderDraft.lineItems]);

  const handleLineItemChange = (index, field, value) => {
    setOrderDraft((prev) => {
      const items = [...prev.lineItems];
      items[index] = {
        ...items[index],
        [field]: field === 'hardwareQuantity' || field === 'laborQuantity' || field === 'hardwarePrice' || field === 'laborPrice'
          ? value === '' ? '' : Number(value)
          : value,
      };
      return { ...prev, lineItems: items };
    });
  };

  const handleAddLineItem = () => {
    setOrderDraft((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { name: '', description: '', hardwareQuantity: 1, laborQuantity: 1, hardwarePrice: 0, laborPrice: 0, hardwareUnit: '', laborUnit: '' }],
    }));
  };

  const handleRemoveLineItem = (index) => {
    setOrderDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, idx) => idx !== index),
    }));
  };

  const handleAddPayment = async () => {
    if (!selectedAppointmentId) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast({ title: 'Suma nu este valida', type: 'error' });
      return;
    }

    setIsRecordingPayment(true);
    try {
      await createPayment({
        appointmentId: selectedAppointmentId,
        amount,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes || undefined,
        reference: paymentForm.reference || undefined,
      });

      showToast({ title: 'Plata inregistrata cu succes', type: 'success' });
      setIsPaymentModalOpen(false);
      setPaymentForm({
        amount: '',
        paymentMethod: 'CASH',
        notes: '',
        reference: '',
      });

      // Refresh payment data
      await fetchPayments(selectedAppointmentId);
      await fetchPaymentStatus(selectedAppointmentId);
      queryClient.invalidateQueries({ queryKey: ['appointment', selectedAppointmentId] });

      // Delay service order refetch to allow backend PDF regeneration to complete
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['service-order', selectedAppointmentId],
          refetchType: 'active'
        });
        queryClient.refetchQueries({
          queryKey: ['service-order', selectedAppointmentId]
        });
      }, 2000);
    } catch (error) {
      showToast({
        title: 'Nu am putut inregistra plata',
        description: error?.message || 'Incearca din nou.',
        type: 'error',
      });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!await confirm({ title: 'Sterge plata', text: 'Esti sigur ca vrei sa stergi aceasta plata?', confirmText: 'Sterge', danger: true })) return;

    try {
      await deletePayment(paymentId);
      showToast({ title: 'Plata stearsa cu succes', type: 'success' });

      // Refresh payment data
      await fetchPayments(selectedAppointmentId);
      await fetchPaymentStatus(selectedAppointmentId);
      queryClient.invalidateQueries({ queryKey: ['appointment', selectedAppointmentId] });

      // Delay service order refetch to allow backend PDF regeneration to complete
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['service-order', selectedAppointmentId],
          refetchType: 'active'
        });
        queryClient.refetchQueries({
          queryKey: ['service-order', selectedAppointmentId]
        });
      }, 2000);
    } catch (error) {
      showToast({
        title: 'Nu am putut sterge plata',
        description: error?.message || 'Incearca din nou.',
        type: 'error',
      });
    }
  };

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    const errors = [];
    const title = formState.title.trim();
    if (!title) {
      errors.push('Titlul este obligatoriu.');
    }

    // Validate client name based on type
    const clientType = clientForm.type === 'SRL' ? 'SRL' : 'PF';
    if (clientType === 'SRL') {
      if (!clientForm.companyName.trim()) {
        errors.push('Denumirea companiei este obligatorie pentru clientii SRL.');
      }
    } else {
      // For PF clients, first name is required
      if (!clientForm.firstName.trim()) {
        errors.push('Prenumele clientului este obligatoriu.');
      }
    }

    // Validate date/time only if provided (optional now)
    if (formState.scheduledDate && formState.startTime && formState.endTime) {
      const startDateTime = combineDateAndTime(formState.scheduledDate, formState.startTime);
      const endDateTime = combineDateAndTime(formState.scheduledDate, formState.endTime);

      if (!startDateTime || Number.isNaN(startDateTime.valueOf())) {
        errors.push('Ora de inceput nu este valida.');
      }
      if (!endDateTime || Number.isNaN(endDateTime.valueOf())) {
        errors.push('Ora de final nu este valida.');
      }
      if (startDateTime && endDateTime && endDateTime <= startDateTime) {
        errors.push('Ora de final trebuie sa fie dupa ora de inceput.');
      }
    }

    // Line items are now optional - can be added later via edit
    const trimmedItems = orderDraft.lineItems
      .map((item) => ({
        ...item,
        name: (item.name || '').trim(),
        description: (item.description || '').trim(),
      }))
      .filter((item) => item.name.length > 0);


    // Phone, email, vehicle details are all optional now

    if (errors.length) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);

    // Calculate dates if provided
    let startDateTime, endDateTime;
    if (formState.scheduledDate && formState.startTime && formState.endTime) {
      startDateTime = combineDateAndTime(formState.scheduledDate, formState.startTime);
      endDateTime = combineDateAndTime(formState.scheduledDate, formState.endTime);
    }

    const mappedLineItems = trimmedItems.map((item) => ({
      name: item.name,
      description: item.description || undefined,
      hardwareQuantity: Number(item.hardwareQuantity) >= 0 ? Number(item.hardwareQuantity) : 1,
      laborQuantity: Number(item.laborQuantity) >= 0 ? Number(item.laborQuantity) : 1,
      hardwarePrice: Number(item.hardwarePrice) || 0,
      laborPrice: Number(item.laborPrice) || 0,
      hardwareUnit: item.hardwareUnit?.trim() || undefined,
      laborUnit: item.laborUnit?.trim() || undefined,
    }));


    const payload = {
      title,
      description: formState.description?.trim() || undefined,
      scheduledStart: startDateTime ? startDateTime.toISOString() : undefined,
      scheduledEnd: endDateTime ? endDateTime.toISOString() : undefined,
      assigneeIds: Array.from(new Set(formState.assigneeIds)),
      clientId: formState.clientId || undefined,
      assetId: formState.assetId || undefined,
      client: {
        type: clientType,
        firstName: clientForm.firstName?.trim() || undefined,
        lastName: clientForm.lastName?.trim() || undefined,
        companyName: clientForm.companyName?.trim() || undefined,
        contactName: clientForm.contactName?.trim() || undefined,
        phone: clientForm.phone?.trim() || undefined,
        email: clientForm.email?.trim() || undefined,
        vatNumber: clientForm.vatNumber?.trim() || undefined,
        registrationNumber: clientForm.registrationNumber?.trim() || undefined,
        notes: clientForm.notes?.trim() || undefined,
        fidelityCardSerie: clientForm.fidelityCardSerie?.trim() || undefined,
      },
      asset: {
        assetType: sectorAssetType,
        // Extract common fields from metadata for backend
        manufacturer: assetForm.metadata?.make || assetForm.metadata?.brand || undefined,
        model: assetForm.metadata?.model || undefined,
        year: assetForm.metadata?.year ? parseInt(assetForm.metadata.year) : undefined,
        identifier: assetForm.metadata?.plateNumber || assetForm.metadata?.serialNumber || assetForm.metadata?.identifier || undefined,
        metadata: assetForm.metadata,
        notes: assetForm.notes?.trim() || undefined,
      },
      serviceOrder: {
        notes: orderDraft.notes?.trim() || undefined,
        lineItems: mappedLineItems,
      },
      advancePayment: formState.advancePayment && parseFloat(formState.advancePayment) > 0
        ? parseFloat(formState.advancePayment)
        : undefined,
    };

    createMutation.mutate(payload);
  };

  // Filter appointments locally without refetching
  const appointments = useMemo(() => {
    return allAppointments.filter((appointment) => {
      // Status filter
      if (status) {
        const appointmentStatus = appointment.status?.toLowerCase();
        const filterStatus = status.toLowerCase();
        if (appointmentStatus !== filterStatus) return false;
      }

      // Client filter
      if (selectedClientId) {
        if (appointment.clientId !== selectedClientId) return false;
      }

      // Assignee filter
      if (selectedAssigneeId) {
        const hasAssignee = appointment.assignees?.some(
          (a) => (a.user?.id || a.userId) === selectedAssigneeId
        );
        if (!hasAssignee) return false;
      }

      return true;
    });
  }, [allAppointments, status, selectedClientId, selectedAssigneeId]);

  const getStatusColors = (status) => {
    const statusMap = {
      PENDING: { bg: 'rgb(254, 249, 195)', border: 'rgb(250, 204, 21)', text: 'rgb(113, 63, 18)' },
      APPROVED: { bg: 'rgb(219, 234, 254)', border: 'rgb(96, 165, 250)', text: 'rgb(30, 58, 138)' },
      IN_PROGRESS: { bg: 'rgb(254, 243, 199)', border: 'rgb(251, 191, 36)', text: 'rgb(120, 53, 15)' },
      COMPLETED: { bg: 'rgb(209, 250, 229)', border: 'rgb(52, 211, 153)', text: 'rgb(6, 78, 59)' },
      CANCELLED: { bg: 'rgb(254, 226, 226)', border: 'rgb(248, 113, 113)', text: 'rgb(127, 29, 29)' },
    };
    return statusMap[status] || { bg: 'rgb(243, 244, 246)', border: 'rgb(229, 231, 235)', text: 'rgb(55, 65, 81)' };
  };

  const calendarEvents = useMemo(
    () =>
      appointments.map((appointment) => {
        const meta = getStatusMeta(appointment.status);
        return {
          id: appointment.id,
          title: appointment.title || 'Programare',
          start: new Date(appointment.scheduledStart),
          end: new Date(appointment.scheduledEnd),
          resource: {
            status: appointment.status,
            client: appointment.client,
            assignees: appointment.assignees,
            isSelected: appointment.id === selectedAppointmentId,
            className: meta.calendarClass,
          },
        };
      }),
    [appointments, selectedAppointmentId]
  );

  const handleSelectSlot = (slotInfo) => {
    const today = startOfDay(new Date());
    const clickedDate = startOfDay(slotInfo.start);
    if (isBefore(clickedDate, today)) {
      showToast({ title: 'Nu poti crea programari in trecut', type: 'warning' });
      return;
    }
    openCreateModal(slotInfo.start);
  };

  const handleSelectEvent = (event) => {
    if (event.id) {
      setSelectedAppointmentId(event.id);
      setActiveTab('details');
    }
  };

  const eventStyleGetter = (event) => {
    const className = event.resource?.className || '';
    const isSelected = event.resource?.isSelected || false;

    return {
      className: `${className} ${isSelected ? 'is-selected' : ''}`.trim(),
    };
  };

  const handleNavigate = (newDate) => {
    setCalendarDate(newDate);
  };

  const handleViewChange = (newView) => {
    setCalendarView(newView);
  };

  const calendarMessages = {
    allDay: 'Toată ziua',
    previous: 'Anterior',
    next: 'Următor',
    today: 'Astăzi',
    month: 'Lună',
    week: 'Săptămână',
    day: 'Zi',
    agenda: 'Agendă',
    date: 'Data',
    time: 'Ora',
    event: 'Programare',
    noEventsInRange: 'Nu există programări în acest interval.',
    showMore: (total) => `+${total} mai multe`,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Programari</h1>
          <p className="page-subtitle">
            Gestioneaza programarile, echipa alocata si statusul lucrarilor in timp real.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <ExportButton
            entityType="appointments"
            filters={{
              search,
              status,
              startDate: dateRange.start,
              endDate: dateRange.end,
            }}
          />
          <button
            type="button"
            onClick={() => openCreateModal(new Date())}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-all hover:shadow-md"
          >
            <Plus size={16} />
            Programare noua
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status:</span>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`filter-pill ${status === filter.value ? 'active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client:</label>
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value || undefined)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">Toti clientii</option>
              {uniqueClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.type === 'SRL' ? client.companyName : `${client.firstName} ${client.lastName}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsabil:</label>
            <select
              value={selectedAssigneeId || ''}
              onChange={(e) => setSelectedAssigneeId(e.target.value || undefined)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">Toti responsabilii</option>
              {assigneeOptions.map((employee) => (
                <option key={employee.id || employee._id} value={employee.id || employee._id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>

          {(status || selectedClientId || selectedAssigneeId) && (
            <button
              type="button"
              onClick={() => {
                setStatus(undefined);
                setSelectedClientId(undefined);
                setSelectedAssigneeId(undefined);
              }}
              className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
            >
              <X size={14} />
              Reseteaza
            </button>
          )}
        </div>

        {companySettings?.rampCount > 0 && (
          <>
            <div className="h-6 w-px bg-gray-200 hidden sm:block" />
            <span className="text-xs text-gray-500">
              <span className="font-medium">{companySettings.rampCount}</span> rampe configurate
            </span>
          </>
        )}
      </div>

      {/* Calendar Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">Se incarca programarile...</div>
        ) : (
          <>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: calendarView === 'month' ? 800 : 1000 }}
              view={calendarView}
              date={calendarDate}
              onView={handleViewChange}
              onNavigate={handleNavigate}
              views={['month', 'week', 'day']}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              popup
              eventPropGetter={eventStyleGetter}
              components={{
                month: { event: MonthEvent },
              }}
              messages={calendarMessages}
              culture="ro"
              min={new Date(2024, 0, 1, 7, 0, 0)}
              max={new Date(2024, 0, 1, 21, 0, 0)}
              step={15}
              timeslots={4}
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
                  `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
                dayHeaderFormat: (date, culture, localizer) =>
                  localizer.format(date, 'EEEE, dd MMM', culture),
                dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
                  `${localizer.format(start, 'dd MMM', culture)} - ${localizer.format(end, 'dd MMM yyyy', culture)}`,
                monthHeaderFormat: (date, culture, localizer) =>
                  localizer.format(date, 'MMMM yyyy', culture),
              }}
            />
            {calendarEvents.length === 0 && (
              <div className="empty-state">
                <Clock className="empty-state-icon" />
                <p className="empty-state-title">Nu exista programari</p>
                <p className="empty-state-text">Nu s-au gasit programari pentru filtrul selectat.</p>
              </div>
            )}
          </>
        )}
      </div>

      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-4 sm:p-6"
          onMouseDown={(event) => {
            if (isSaving) return;
            if (modalRef.current && !modalRef.current.contains(event.target)) {
              closeCreateModal(true);
            }
          }}
          onTouchStart={(event) => {
            if (isSaving) return;
            if (modalRef.current && !modalRef.current.contains(event.target)) {
              closeCreateModal(true);
            }
          }}
        >
          <div
            ref={modalRef}
            className="relative mx-auto flex h-full max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Creeaza programare</h2>
                <p className="text-sm text-gray-500">Completeaza detaliile necesare pentru noua programare.</p>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => !isSaving && closeCreateModal(true)}
                className={`rounded-full p-1 text-gray-400 transition ${
                  isSaving ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
              {formErrors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <ul className="list-disc space-y-1 pl-5">
                    {formErrors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">Informatii programare</h3>
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 items-end">
                    <div className="flex flex-col lg:col-span-5">
                      <label className="block text-sm font-medium text-gray-700">Titlu *</label>
                      <input
                        type="text"
                        value={formState.title}
                        onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Ex. Revizie auto"
                      />
                    </div>
                    <div className="flex flex-col lg:col-span-3">
                      <DatePicker
                        label="Data programarii *"
                        value={formState.scheduledDate}
                        onChange={(date) => setFormState((prev) => ({ ...prev, scheduledDate: date }))}
                        minDate={startOfDay(new Date())}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ora inceput *</label>
                      <TimePicker
                        value={formState.startTime}
                        onChange={(v) => setFormState((prev) => ({ ...prev, startTime: v }))}
                      />
                    </div>
                    <div className="flex flex-col lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ora final *</label>
                      <TimePicker
                        value={formState.endTime}
                        onChange={(v) => setFormState((prev) => ({ ...prev, endTime: v }))}
                      />
                    </div>
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descriere</label>
                  <textarea
                    value={formState.description}
                    onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Selecteaza responsabili</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assigneeOptions.map((employee) => {
                      const id = employee.id || employee._id;
                      const selected = formState.assigneeIds.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setFormState((prev) => ({
                              ...prev,
                              assigneeIds: selected
                                ? prev.assigneeIds.filter((value) => value !== id)
                                : [...prev.assigneeIds, id],
                            }));
                          }}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary'
                          }`}
                        >
                          {employee.firstName} {employee.lastName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Detalii client</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualClientEntry(!showManualClientEntry);
                      if (!showManualClientEntry) {
                        setSelectedClient(null);
                        setSelectedAsset(null);
                        setClientForm(defaultClientForm);
                        setAssetForm(defaultAssetForm);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    {showManualClientEntry ? 'Cauta client existent' : 'Adauga client nou'}
                  </button>
                </div>

                {!showManualClientEntry ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cauta client existent
                      </label>
                      <ClientAutocomplete
                        onClientSelect={handleClientSelect}
                        placeholder="Cauta dupa nume, telefon, email, numar auto..."
                      />
                    </div>

                    {selectedClient && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Client selectat: {selectedClient.type === 'PF'
                                ? `${selectedClient.firstName} ${selectedClient.lastName}`
                                : selectedClient.companyName}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-600">
                              {selectedClient.phone && <span>Tel: {selectedClient.phone}</span>}
                              {selectedClient.email && <span>Email: {selectedClient.email}</span>}
                            </div>

                            {hasAssets && selectedClient.assets && selectedClient.assets.length > 0 && (
                              <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Selecteaza {assetSingular.toLowerCase()}:
                                </label>
                                <select
                                  value={selectedAsset?.id || ''}
                                  onChange={(e) => handleAssetSelect(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {selectedClient.assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                      {asset.identifier || asset.name || 'Fara identificator'} - {asset.manufacturer} {asset.model}
                                      {asset.year && ` (${asset.year})`}
                                    </option>
                                  ))}
                                  <option value="new">+ Adauga {assetSingular.toLowerCase()} nou</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClient(null);
                              setSelectedAsset(null);
                              setClientForm(defaultClientForm);
                              setAssetForm(defaultAssetForm);
                            }}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-2">
                        {[
                          { label: 'Client PF', value: 'PF' },
                          { label: 'Client SRL', value: 'SRL' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setClientForm((prev) => ({ ...prev, type: option.value }))}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              clientForm.type === option.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {showManualClientEntry && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {clientForm.type === 'SRL' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Denumire companie *</label>
                          <input
                            type="text"
                            value={clientForm.companyName}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, companyName: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Persoana de contact</label>
                          <input
                            type="text"
                            value={clientForm.contactName}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, contactName: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">CUI *</label>
                          <input
                            type="text"
                            value={clientForm.vatNumber}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, vatNumber: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nr. registru comert</label>
                          <input
                            type="text"
                            value={clientForm.registrationNumber}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, registrationName: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Prenume *</label>
                          <input
                            type="text"
                            value={clientForm.firstName}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, firstName: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nume *</label>
                          <input
                            type="text"
                            value={clientForm.lastName}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, lastName: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={clientForm.email}
                        onChange={(event) => setClientForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefon</label>
                      <input
                        type="tel"
                        value={clientForm.phone}
                        onChange={(event) => setClientForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Serie card fidelitate</label>
                      <input
                        type="text"
                        value={clientForm.fidelityCardSerie}
                        onChange={(event) => setClientForm((prev) => ({ ...prev, fidelityCardSerie: event.target.value }))}
                        placeholder="FL123456"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Note client</label>
                      <textarea
                        value={clientForm.notes}
                        onChange={(event) => setClientForm((prev) => ({ ...prev, notes: event.target.value }))}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Asset Details Section - only shown for sectors with assets */}
              {hasAssets && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">Detalii {assetSingular.toLowerCase()}</h3>
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-4">Completeaza informatiile despre {assetSingular.toLowerCase()}.</p>

                  {/* Dynamic Asset Fields - uses sector-derived asset type */}
                  <div className="mb-4">
                    <DynamicAssetFields
                      assetType={sectorAssetType}
                      formData={assetForm}
                      onChange={setAssetForm}
                    />
                  </div>

                  {/* Notes field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Note {assetSingular.toLowerCase()}
                    </label>
                    <textarea
                      value={assetForm.notes}
                      onChange={(event) => setAssetForm((prev) => ({ ...prev, notes: event.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder={`Observatii sau detalii suplimentare despre ${assetSingular.toLowerCase()}`}
                    />
                  </div>
                </div>
              </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Articole comanda</h3>
                  <p className="text-xs text-gray-500 mt-1">Adauga operatiunile care vor aparea in comanda de service.</p>
                </div>

                <div className="space-y-4">
                  {orderDraft.lineItems.map((item, index) => {
                    const hardwareQty = Number(item.hardwareQuantity) || 0;
                    const laborQty = Number(item.laborQuantity) || 0;
                    const hardware = Number(item.hardwarePrice) || 0;
                    const labor = Number(item.laborPrice) || 0;
                    const amount = (hardwareQty * hardware) + (laborQty * labor);
                    const amountValue = Number.isFinite(amount) ? amount : 0;

                    return (
                      <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        {/* Header: Item name and remove button */}
                        <div className="flex items-start gap-2 mb-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Nume articol/serviciu</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(event) => handleLineItemChange(index, 'name', event.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="ex: Schimb ulei, Becuri, etc."
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="mt-5 rounded p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                            title="Sterge linia"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Description */}
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Descriere (optional)</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(event) => handleLineItemChange(index, 'description', event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Detalii suplimentare"
                          />
                        </div>

                        {/* Split sections for Hardware and Labor */}
                        <div className={`grid gap-3 ${hasAssets ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                          {/* Hardware Section - only shown for sectors with assets */}
                          {hasAssets && (
                            <div className="rounded-lg border border-blue-200 bg-white p-2.5">
                              <h4 className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                Piese & Materiale
                              </h4>
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <div className="w-16">
                                    <label className="block text-xs text-gray-600 mb-1">Cant.</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={item.hardwareQuantity}
                                      onChange={(event) => handleLineItemChange(index, 'hardwareQuantity', event.target.value)}
                                      className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-primary focus:outline-none"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-600 mb-1">Unitate</label>
                                    <select
                                      value={item.hardwareUnit || ''}
                                      onChange={(event) => handleLineItemChange(index, 'hardwareUnit', event.target.value)}
                                      className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-primary focus:outline-none"
                                    >
                                      <option value="">-</option>
                                      {HARDWARE_UNITS.map((unit) => (
                                        <option key={unit.value} value={unit.value}>
                                          {unit.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Pret unitar (RON)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.hardwarePrice}
                                    onChange={(event) => handleLineItemChange(index, 'hardwarePrice', event.target.value)}
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Labor Section */}
                          <div className="rounded-lg border border-amber-200 bg-white p-2.5">
                            <h4 className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                              </svg>
                              Manopera
                            </h4>
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <div className="w-16">
                                  <label className="block text-xs text-gray-600 mb-1">Cant.</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={item.laborQuantity}
                                    onChange={(event) => handleLineItemChange(index, 'laborQuantity', event.target.value)}
                                    className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-primary focus:outline-none"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-600 mb-1">Unitate</label>
                                  <select
                                    value={item.laborUnit || ''}
                                    onChange={(event) => handleLineItemChange(index, 'laborUnit', event.target.value)}
                                    className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-primary focus:outline-none"
                                  >
                                    <option value="">-</option>
                                    {LABOR_UNITS.map((unit) => (
                                      <option key={unit.value} value={unit.value}>
                                        {unit.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Pret unitar (RON)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.laborPrice}
                                  onChange={(event) => handleLineItemChange(index, 'laborPrice', event.target.value)}
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Total for this line item */}
                        <div className="mt-2 pt-2 border-t border-gray-300 flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700">Total linie:</span>
                          <span className="font-bold text-gray-900">{currencyFormatter.format(amountValue)}</span>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus size={16} /> Adauga articol/serviciu
                  </button>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between gap-6">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900">{currencyFormatter.format(orderTotals.subtotal)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-6 border-t pt-1 text-sm font-semibold text-gray-900">
                      <span>Total</span>
                      <span>{currencyFormatter.format(orderTotals.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <label htmlFor="advancePayment" className="block text-sm font-medium text-gray-700 mb-2">
                    Avans (optional)
                  </label>
                  <div className="relative">
                    <input
                      id="advancePayment"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.advancePayment}
                      onChange={(event) => setFormState((prev) => ({ ...prev, advancePayment: event.target.value }))}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">RON</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">Suma platita la programare</p>
                  {formState.advancePayment && parseFloat(formState.advancePayment) > 0 && orderTotals.total > 0 && (
                    <div className="mt-2 text-xs">
                      {parseFloat(formState.advancePayment) > orderTotals.total ? (
                        <p className="text-red-600">Avansul nu poate depasi totalul ({currencyFormatter.format(orderTotals.total)})</p>
                      ) : (
                        <p className="text-green-700">
                          Rest de plata: {currencyFormatter.format(orderTotals.total - parseFloat(formState.advancePayment))}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => !isSaving && closeCreateModal(true)}
                  className={`rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition ${
                    isSaving ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50'
                  }`}
                >
                  Anuleaza
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Se creeaza...' : 'Salveaza programarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAppointmentId && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-3xl flex-col border-l border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Detalii programare</h2>
              <p className="text-sm text-gray-500">Consulta programarea, echipa alocata si conversatiile.</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedAppointment?.status !== 'COMPLETED' && !isEditingAppointment && (
                <button
                  type="button"
                  onClick={startEditingAppointment}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={14} />
                  Editeaza
                </button>
              )}
              {isEditingAppointment && (
                <>
                  <button
                    type="button"
                    onClick={handleSaveAppointment}
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Save size={14} />
                    {updateMutation.isPending ? 'Se salveaza...' : 'Salveaza'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingAppointment}
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Anuleaza
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedAppointmentId(null);
                  setIsEditingAppointment(false);
                }}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex border-b px-6">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`relative px-4 py-3 text-sm font-medium transition ${
                activeTab === 'details' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Detalii
              {activeTab === 'details' && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`relative px-4 py-3 text-sm font-medium transition ${
                activeTab === 'messages' ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                Mesaje
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white min-w-[1.25rem]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              {activeTab === 'messages' && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary" />}
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              {!selectedAppointment ? (
                <div className="text-sm text-gray-500">Se incarca detaliile...</div>
              ) : (
                <>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <h3 className="text-base font-semibold text-gray-900">Prezentare generala</h3>
                    {isEditingAppointment ? (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Titlu *</label>
                          <input
                            type="text"
                            value={editForm.title || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Ex. Revizie auto"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <DatePicker
                              label="Data programarii *"
                              value={editForm.scheduledDate}
                              onChange={(date) => setEditForm(prev => ({ ...prev, scheduledDate: date }))}
                              minDate={startOfDay(new Date())}
                              required
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ora inceput *</label>
                            <TimePicker
                              value={editForm.startTime || '09:00'}
                              onChange={(v) => setEditForm(prev => ({ ...prev, startTime: v }))}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ora final *</label>
                            <TimePicker
                              value={editForm.endTime || '10:00'}
                              onChange={(v) => setEditForm(prev => ({ ...prev, endTime: v }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
                          <textarea
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Descriere programare..."
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                          <div className="md:col-span-3">
                            <dt className="text-gray-500">Status</dt>
                            <dd className="mt-1 flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusMeta(selectedAppointment.status).badgeClass}`}
                                >
                                  {getStatusMeta(selectedAppointment.status).label}
                                  {selectedAppointment.status === 'COMPLETED' && (
                                    <span className="ml-2" title="Programare finalizata - Blocata">
                                      🔒
                                    </span>
                                  )}
                                </span>
                                {/* Google Calendar Sync Status */}
                                {googleSyncStatus?.synced ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 border border-green-200"
                                    title={`Sincronizat cu Google Calendar${googleSyncStatus.lastSyncAt ? ` la ${new Date(googleSyncStatus.lastSyncAt).toLocaleString('ro-RO')}` : ''}`}
                                  >
                                    <Cloud className="w-3 h-3" />
                                    Sincronizat
                                  </span>
                                ) : googleSyncStatus && !googleSyncStatus.synced ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500 border border-gray-200"
                                    title="Nu este sincronizat cu Google Calendar"
                                  >
                                    <CloudOff className="w-3 h-3" />
                                    Nesincronizat
                                  </span>
                                ) : null}
                                {/* Location Badge */}
                                <LocationBadge
                                  locationId={selectedAppointment.locationId}
                                  locationName={selectedAppointment.location?.name}
                                  size="xs"
                                  showAlways
                                />
                              </div>
                              {selectedAppointment.status !== 'COMPLETED' ? (
                                <div className="relative">
                                  <select
                                    value={selectedAppointment.status || 'PENDING'}
                                    disabled={updateMutation.isPending}
                                    onChange={(event) => handleStatusChange(event.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                                  >
                                    {STATUS_SEQUENCE.filter(s => s !== 'CANCELLED' || selectedAppointment.status !== 'COMPLETED').map((value) => (
                                      <option key={value} value={value}>
                                        {getStatusMeta(value).label}
                                      </option>
                                    ))}
                                  </select>
                                  {updateMutation.isPending && (
                                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">Programarea este finalizata si nu mai poate fi modificata.</p>
                              )}
                            </dd>
                          </div>
                          <div className="md:col-span-3">
                            <dt className="text-gray-500">Titlu</dt>
                            <dd className="font-medium text-gray-900">{selectedAppointment.title}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Data</dt>
                            <dd className="font-medium text-gray-900">
                              {formatDateTime(selectedAppointment.scheduledStart, 'dd.MM.yyyy')}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Ora inceput</dt>
                            <dd className="font-medium text-gray-900">
                              {formatDateTime(selectedAppointment.scheduledStart, 'HH:mm')}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Ora final</dt>
                            <dd className="font-medium text-gray-900">
                              {formatDateTime(selectedAppointment.scheduledEnd, 'HH:mm')}
                            </dd>
                          </div>
                        </dl>
                        {selectedAppointment.description && (
                          <div className="mt-4">
                            <dt className="text-sm text-gray-500">Descriere</dt>
                            <dd className="mt-1 text-sm text-gray-600">{selectedAppointment.description}</dd>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="text-base font-semibold text-gray-900">Client</h3>
                    {selectedAppointment.client ? (
                      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div>
                          <dt className="text-gray-500">Tip</dt>
                          <dd className="font-medium text-gray-900">
                            {selectedAppointment.client.type === 'SRL'
                              ? 'Client companie (SRL)'
                              : 'Client persoana fizica (PF)'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Nume</dt>
                          <dd className="font-medium text-gray-900">
                            {selectedAppointment.client.type === 'SRL'
                              ? selectedAppointment.client.companyName || 'Client companie'
                              : `${selectedAppointment.client.firstName || ''} ${selectedAppointment.client.lastName || ''}`.trim() || selectedAppointment.client.contactName || '-'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Persoana de contact</dt>
                          <dd className="font-medium text-gray-900">
                            {selectedAppointment.client.contactName || `${selectedAppointment.client.firstName || ''} ${selectedAppointment.client.lastName || ''}`.trim() || '-'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Telefon</dt>
                          <dd className="font-medium text-gray-900">{selectedAppointment.client.phone || '-'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Email</dt>
                          <dd className="font-medium text-gray-900">{selectedAppointment.client.email || '-'}</dd>
                        </div>
                        {selectedAppointment.client.type === 'SRL' ? (
                          <>
                            <div>
                              <dt className="text-gray-500">CUI</dt>
                              <dd className="font-medium text-gray-900">{selectedAppointment.client.vatNumber || '-'}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-500">Nr. registru comert</dt>
                              <dd className="font-medium text-gray-900">{selectedAppointment.client.registrationNumber || '-'}</dd>
                            </div>
                          </>
                        ) : null}
                        {selectedAppointment.client.notes ? (
                          <div className="md:col-span-2">
                            <dt className="text-gray-500">Note</dt>
                            <dd className="text-gray-700">{selectedAppointment.client.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">Nu exista client asociat.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="text-base font-semibold text-gray-900">{assetSingular}</h3>
                    {selectedAppointment.asset ? (
                      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        {/* Show asset name */}
                        <div className="md:col-span-2">
                          <dt className="text-gray-500">Nume</dt>
                          <dd className="font-medium text-gray-900">{selectedAppointment.asset.name}</dd>
                        </div>

                        {/* Show asset type - uses terminology from sector */}
                        {selectedAppointment.asset.type && (
                          <div>
                            <dt className="text-gray-500">Tip</dt>
                            <dd className="font-medium text-gray-900">{assetSingular}</dd>
                          </div>
                        )}

                        {/* Show identifier */}
                        {selectedAppointment.asset.identifier && (
                          <div>
                            <dt className="text-gray-500">Identificator</dt>
                            <dd className="font-medium text-gray-900">{selectedAppointment.asset.identifier}</dd>
                          </div>
                        )}

                        {/* Dynamically render metadata fields */}
                        {selectedAppointment.asset.metadata && Object.entries(selectedAppointment.asset.metadata).map(([key, value]) => {
                          if (!value) return null;

                          // Format the label nicely
                          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                          return (
                            <div key={key}>
                              <dt className="text-gray-500">{label}</dt>
                              <dd className="font-medium text-gray-900">{value}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">Nu exista informatii despre {assetSingular.toLowerCase()}.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <h3 className="text-base font-semibold text-gray-900">Echipa alocata</h3>
                    {isEditingAppointment ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {assigneeOptions.map((employee) => {
                          const id = employee.id || employee._id;
                          const selected = editForm.assigneeIds?.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                setEditForm((prev) => ({
                                  ...prev,
                                  assigneeIds: selected
                                    ? prev.assigneeIds.filter((value) => value !== id)
                                    : [...(prev.assigneeIds || []), id],
                                }));
                              }}
                              className={`rounded-full border px-3 py-1 text-xs transition ${
                                selected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-gray-200 text-gray-600 hover:border-primary/40 hover:text-primary'
                              }`}
                            >
                              {employee.firstName} {employee.lastName}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedAppointment.assignees?.length ? (
                          selectedAppointment.assignees.map((assignee) => (
                            <span key={assignee.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                              {assignee.user?.firstName} {assignee.user?.lastName}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Niciun responsabil alocat.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Comanda de service</h3>
                        <p className="text-xs text-gray-500">Administreaza articolele facturabile pentru aceasta lucrare.</p>
                      </div>
                      <div className="flex gap-2">
                        {hasAssets && (<>
                        <button
                          type="button"
                          disabled={!selectedAppointmentId || previewPdfMutation.isPending || isPdfLoading}
                          onClick={async (event) => {
                            if (!selectedAppointmentId) return;
                            const shouldRefresh = event?.shiftKey || event?.metaKey || event?.ctrlKey;

                            setIsPdfLoading(true);
                            try {
                              if (shouldRefresh) {
                                // Only regenerate, don't open
                                await downloadServiceOrderPdf(selectedAppointmentId, { refresh: true });
                                showToast({
                                  title: 'PDF regenerat cu succes',
                                  type: 'success',
                                });
                              } else {
                                // Normal view - open the PDF
                                const { blob: pdfBlob } = await downloadServiceOrderPdf(selectedAppointmentId, { refresh: false });
                                const pdfUrl = window.URL.createObjectURL(pdfBlob);
                                window.open(pdfUrl, '_blank');
                                setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 60000);
                              }
                            } catch (error) {
                              showToast({
                                title: shouldRefresh ? 'Nu am putut regenera PDF-ul' : 'Nu am putut deschide PDF-ul',
                                description: getErrorMessage(error),
                                type: 'error',
                              });
                            } finally {
                              setIsPdfLoading(false);
                            }
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Click pentru a deschide PDF. Tine Shift pentru a regenera."
                        >
                          {isPdfLoading ? (
                            <>
                              <div className="mr-1 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
                              Se incarca...
                            </>
                          ) : (
                            <>
                              <FileText size={14} className="mr-1 inline" />
                              Vezi PDF
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={!selectedAppointmentId || previewPdfMutation.isPending || isDownloadingPdf}
                          onClick={async () => {
                            if (!selectedAppointmentId) return;
                            setIsDownloadingPdf(true);
                            try {
                              const { blob, filename } = await downloadServiceOrderPdf(selectedAppointmentId, { refresh: false });
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = filename;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              showToast({ title: 'PDF descarcat', type: 'success' });
                            } catch (error) {
                              showToast({ title: 'Descarcarea a esuat', description: getErrorMessage(error), type: 'error' });
                            } finally {
                              setIsDownloadingPdf(false);
                            }
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Descarca PDF pe calculator"
                        >
                          {isDownloadingPdf ? (
                            <>
                              <svg className="mr-1 inline h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Se descarca...
                            </>
                          ) : (
                            <>
                              <svg className="mr-1 inline h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Descarca
                            </>
                          )}
                        </button>
                        </>)}
                        {selectedAppointment.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => setIsEditingOrder((prev) => !prev)}
                            className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white transition hover:bg-primary/90"
                          >
                            {isEditingOrder ? 'Inchide editorul' : 'Editeaza'}
                          </button>
                        )}
                      </div>
                    </div>

                    {orderLoading ? (
                      <p className="mt-4 text-sm text-gray-500">Se incarca comanda de service...</p>
                    ) : isEditingOrder ? (
                      <div className="mt-4 space-y-4">
                        <div className="space-y-4">
                          {orderDraft.lineItems.map((item, index) => {
                            const hardwareQty = Number(item.hardwareQuantity) || 0;
                            const laborQty = Number(item.laborQuantity) || 0;
                            const hardware = Number(item.hardwarePrice) || 0;
                            const labor = Number(item.laborPrice) || 0;
                            const amount = (hardwareQty * hardware) + (laborQty * labor);
                            const amountValue = Number.isFinite(amount) ? amount : 0;

                            return (
                              <div key={index} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                {/* Header: Item name and remove button */}
                                <div className="flex items-start gap-3 mb-3">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nume articol/serviciu</label>
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(event) => handleLineItemChange(index, 'name', event.target.value)}
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="ex: Schimb ulei motor, Becuri far, etc."
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLineItem(index)}
                                    className="mt-6 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                                    title="Sterge linia"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>

                                {/* Description */}
                                <div className="mb-4">
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Descriere (optional)</label>
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(event) => handleLineItemChange(index, 'description', event.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Detalii suplimentare despre serviciu"
                                  />
                                </div>

                                {/* Split sections for Hardware and Labor */}
                                <div className={`grid gap-4 ${hasAssets ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                                  {/* Hardware Section - only shown for sectors with assets */}
                                  {hasAssets && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3">
                                      <h4 className="text-xs font-semibold text-blue-900 mb-3 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                        Piese & Materiale
                                      </h4>
                                      <div className="space-y-2">
                                        <div className="flex gap-2">
                                          <div className="w-20">
                                            <label className="block text-xs text-gray-600 mb-1">Cant.</label>
                                            <input
                                              type="number"
                                              min="0"
                                              step="1"
                                              value={item.hardwareQuantity}
                                              onChange={(event) => handleLineItemChange(index, 'hardwareQuantity', event.target.value)}
                                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                          </div>
                                          <div className="flex-1">
                                            <label className="block text-xs text-gray-600 mb-1">Unitate</label>
                                            <select
                                              value={item.hardwareUnit || ''}
                                              onChange={(event) => handleLineItemChange(index, 'hardwareUnit', event.target.value)}
                                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                              <option value="">Alege...</option>
                                              {HARDWARE_UNITS.map((unit) => (
                                                <option key={unit.value} value={unit.value}>
                                                  {unit.label}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600 mb-1">Pret unitar piese (RON)</label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.hardwarePrice}
                                            onChange={(event) => handleLineItemChange(index, 'hardwarePrice', event.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                            placeholder="0.00"
                                          />
                                        </div>
                                        {hardware > 0 && (
                                          <div className="text-xs text-blue-700 font-medium mt-2 pt-2 border-t border-blue-200">
                                            Subtotal piese: {currencyFormatter.format(hardwareQty * hardware)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Labor Section */}
                                  <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-3">
                                    <h4 className="text-xs font-semibold text-amber-900 mb-3 flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                      </svg>
                                      Manopera
                                    </h4>
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <div className="w-20">
                                          <label className="block text-xs text-gray-600 mb-1">Cant.</label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.5"
                                            value={item.laborQuantity}
                                            onChange={(event) => handleLineItemChange(index, 'laborQuantity', event.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-xs text-gray-600 mb-1">Unitate</label>
                                          <select
                                            value={item.laborUnit || ''}
                                            onChange={(event) => handleLineItemChange(index, 'laborUnit', event.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                          >
                                            <option value="">Alege...</option>
                                            {LABOR_UNITS.map((unit) => (
                                              <option key={unit.value} value={unit.value}>
                                                {unit.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Pret unitar manopera (RON)</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={item.laborPrice}
                                          onChange={(event) => handleLineItemChange(index, 'laborPrice', event.target.value)}
                                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      {labor > 0 && (
                                        <div className="text-xs text-amber-700 font-medium mt-2 pt-2 border-t border-amber-200">
                                          Subtotal manopera: {currencyFormatter.format(laborQty * labor)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Total for this line item */}
                                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-700">Total linie:</span>
                                  <span className="text-lg font-bold text-gray-900">{currencyFormatter.format(amountValue)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={handleAddLineItem}
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                          >
                            <Plus size={16} /> Adauga articol/serviciu
                          </button>
                          <div className="text-sm text-gray-700">
                            <div className="flex items-center justify-between gap-6">
                              <span>Subtotal</span>
                              <span className="font-semibold text-gray-900">{currencyFormatter.format(orderTotals.subtotal)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-6 border-t pt-1 text-sm font-semibold text-gray-900">
                              <span>Total</span>
                              <span>{currencyFormatter.format(orderTotals.total)}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Note interne</label>
                          <textarea
                            value={orderDraft.notes}
                            onChange={(event) => setOrderDraft((prev) => ({ ...prev, notes: event.target.value }))}
                            rows={3}
                            className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end gap-3 border-t pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingOrder(false);
                              setOrderDraft({
                                notes: serviceOrder?.notes || '',
                                lineItems: serviceOrder?.lineItems?.length
                                  ? serviceOrder.lineItems.map((item) => ({
                                      id: item.id,
                                      name: item.name,
                                      description: item.description || '',
                                      hardwareQuantity: item.hardwareQuantity !== null && item.hardwareQuantity !== undefined ? item.hardwareQuantity : (item.quantity || 1),
                                      laborQuantity: item.laborQuantity !== null && item.laborQuantity !== undefined ? item.laborQuantity : (item.quantity || 1),
                                      // Use the enhanced fields if available, otherwise fallback to legacy unitPrice (put in labor)
                                      hardwarePrice: item.hardwarePrice !== undefined && item.hardwarePrice !== null ? item.hardwarePrice : 0,
                                      laborPrice: item.laborPrice !== undefined && item.laborPrice !== null ? item.laborPrice : (item.unitPrice || 0),
                                      hardwareUnit: item.hardwareUnit || '',
                                      laborUnit: item.laborUnit || '',
                                    }))
                                  : [{ name: '', description: '', hardwareQuantity: 1, laborQuantity: 1, hardwarePrice: 0, laborPrice: 0, hardwareUnit: '', laborUnit: '' }],
                              });
                            }}
                            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                          >
                            Renunta
                          </button>
                          <button
                            type="button"
                            disabled={saveOrderMutation.isPending}
                            onClick={async () => {
                              const items = orderDraft.lineItems.filter((item) => item.name.trim());
                              if (!items.length) {
                                showToast({ title: 'Adauga cel putin o linie', type: 'error' });
                                return;
                              }
                              const payload = {
                                lineItems: items.map(item => ({
                                  name: item.name,
                                  description: item.description || undefined,
                                  hardwareQuantity: Number(item.hardwareQuantity) >= 0 ? Number(item.hardwareQuantity) : 1,
                                  laborQuantity: Number(item.laborQuantity) >= 0 ? Number(item.laborQuantity) : 1,
                                  hardwarePrice: Number(item.hardwarePrice) || 0,
                                  laborPrice: Number(item.laborPrice) || 0,
                                  hardwareUnit: item.hardwareUnit || undefined,
                                  laborUnit: item.laborUnit || undefined,
                                })),
                                notes: orderDraft.notes,
                              };
                              try {
                                await saveOrderMutation.mutateAsync(payload);
                                showToast({ title: 'Comanda de service salvata', type: 'success' });
                                setIsEditingOrder(false);
                                // Refetch payment status to update remaining balance
                                if (selectedAppointmentId) {
                                  fetchPaymentStatus(selectedAppointmentId);
                                }
                              } catch (error) {
                                showToast({
                                  title: 'Salvarea comenzii a esuat',
                                  description: getErrorMessage(error, 'Nu s-a putut salva comanda de service. Va rugam verificati datele introduse.'),
                                  type: 'error'
                                });
                              }
                            }}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50"
                          >
                            {saveOrderMutation.isPending ? 'Se salveaza…' : 'Salveaza comanda'}
                          </button>
                        </div>
                      </div>
                    ) : serviceOrder ? (
                      <div className="mt-4 space-y-4">
                        <div className="space-y-3">
                          {(serviceOrder.lineItems || []).map((item) => {
                            const hardware = item.hardwarePrice !== undefined ? item.hardwarePrice : (item.unitPrice || 0);
                            const labor = item.laborPrice || 0;
                            const hardwareQty = item.hardwareQuantity !== null && item.hardwareQuantity !== undefined ? item.hardwareQuantity : (item.quantity || 1);
                            const laborQty = item.laborQuantity !== null && item.laborQuantity !== undefined ? item.laborQuantity : (item.quantity || 1);
                            const totalPrice = (hardwareQty * Number(hardware)) + (laborQty * Number(labor));

                            return (
                              <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                    {item.description && (
                                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <div className="text-lg font-bold text-gray-900">{currencyFormatter.format(totalPrice)}</div>
                                  </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 mt-3 pt-3 border-t border-gray-100">
                                  {/* Hardware details */}
                                  {hardware > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                      <div>
                                        <span className="font-medium text-gray-700">Piese:</span>{' '}
                                        <span className="text-gray-900">
                                          {hardwareQty} {item.hardwareUnit || ''} × {currencyFormatter.format(Number(hardware))}
                                        </span>
                                        <span className="text-gray-600 ml-1">
                                          = {currencyFormatter.format(hardwareQty * Number(hardware))}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Labor details */}
                                  {labor > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                      </svg>
                                      <div>
                                        <span className="font-medium text-gray-700">Manopera:</span>{' '}
                                        <span className="text-gray-900">
                                          {laborQty} {item.laborUnit || ''} × {currencyFormatter.format(Number(labor))}
                                        </span>
                                        <span className="text-gray-600 ml-1">
                                          = {currencyFormatter.format(laborQty * Number(labor))}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {hasAssets && serviceOrder.pdfUrl ? (
                          <div className="overflow-hidden rounded-xl border border-gray-200">
                            <div className="border-b bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                              <span>Vizualizare comanda de service</span>
                            </div>
                            <iframe
                              key={`pdf-${serviceOrder.id}-${serviceOrder.updatedAt || Date.now()}-${Math.random()}`}
                              title="Comanda de service"
                              src={serviceOrder.pdfUrl ? `${getFileUrl(serviceOrder.pdfUrl)}&t=${new Date(serviceOrder.updatedAt || Date.now()).getTime()}&r=${Math.random()}#toolbar=0` : ''}
                              className="h-80 w-full rounded border border-gray-200 bg-white"
                            />
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between text-sm text-gray-700">
                          <span>Subtotal</span>
                          <span className="font-semibold text-gray-900">{currencyFormatter.format(Number(serviceOrder.subtotal || 0))}</span>
                        </div>
                        {Number(serviceOrder.tax || 0) > 0 && (
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>TVA</span>
                            <span>{currencyFormatter.format(Number(serviceOrder.tax))}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold text-gray-900">
                          <span>Total</span>
                          <span>{currencyFormatter.format(Number(serviceOrder.total || 0))}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                        Nu exista inca o comanda de service. Foloseste butonul Editeaza pentru a adauga articole si totaluri.
                      </div>
                    )}
                  </div>

                  {/* Payment Section */}
                  {serviceOrder && (
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-900">Plata</h3>
                        {selectedAppointment.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
                          >
                            <Plus size={14} />
                            Adauga plata
                          </button>
                        )}
                      </div>

                      {isLoadingPaymentStatus || isLoadingPayments ? (
                        <div className="mt-3 flex items-center justify-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary"></div>
                        </div>
                      ) : paymentStatus ? (
                        <div className="mt-3 space-y-4">
                          {/* Payment Summary */}
                          <div className="rounded-lg bg-gray-50 p-3 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Total comenzi:</span>
                              <span className="font-semibold text-gray-900">{currencyFormatter.format(Number(paymentStatus.total || 0))}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm border-t pt-2">
                              <span className="flex items-center gap-1.5 text-gray-600">
                                <CheckCircle2 size={14} className="text-green-600" />
                                Total platit:
                              </span>
                              <span className="font-semibold text-green-700">{currencyFormatter.format(Number(paymentStatus.totalPaid || 0))}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm border-t pt-2">
                              <span className="font-medium text-gray-700">Rest de plata:</span>
                              <span className={`font-bold ${Number(paymentStatus.remaining || 0) > 0 ? 'text-orange-600' : 'text-green-700'}`}>
                                {currencyFormatter.format(Number(paymentStatus.remaining || 0))}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-t pt-2">
                              <span className="text-xs text-gray-500">Status:</span>
                              {(() => {
                                const meta = getPaymentStatusMeta(paymentStatus.status);
                                const Icon = meta.icon;
                                return (
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}>
                                    <Icon size={12} />
                                    {meta.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          {/* Payment History */}
                          {payments.length > 0 ? (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Istoric plati</h4>
                              <div className="space-y-2">
                                {payments.map((payment, index) => (
                                  <div
                                    key={payment.id}
                                    className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-gray-900">
                                            Plata #{index + 1}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {formatDateTime(payment.paymentDate, 'dd MMM yyyy, HH:mm')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                          <span className="font-medium">
                                            {currencyFormatter.format(Number(payment.amount))}
                                          </span>
                                          <span className="text-gray-400">•</span>
                                          <span>
                                            {payment.paymentMethod === 'CASH' && 'Numerar'}
                                            {payment.paymentMethod === 'CARD' && 'Card'}
                                            {payment.paymentMethod === 'BANK_TRANSFER' && 'Transfer bancar'}
                                            {payment.paymentMethod === 'OTHER' && 'Altele'}
                                          </span>
                                        </div>
                                        {payment.reference && (
                                          <div className="mt-1 text-xs text-gray-500">
                                            Referinta: {payment.reference}
                                          </div>
                                        )}
                                        {payment.notes && (
                                          <div className="mt-1 text-xs text-gray-600">
                                            {payment.notes}
                                          </div>
                                        )}
                                      </div>
                                      {user?.role === USER_ROLES.ADMIN && selectedAppointment.status !== 'COMPLETED' && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeletePayment(payment.id)}
                                          className="ml-2 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                          title="Sterge plata"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
                              Nu exista plati inregistrate inca
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">
                          Nu exista informatii despre plata. Asigura-te ca exista o comanda de service.
                        </p>
                      )}
                    </div>
                  )}

                  {selectedAppointment.status === 'COMPLETED' && serviceOrder && (
                    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Factură</h3>
                          <p className="text-xs text-gray-500">Generează factură pentru această programare finalizată.</p>
                        </div>
                        <button
                          type="button"
                          disabled={createInvoiceMutation.isPending}
                          onClick={() => {
                            createInvoiceMutation.mutate({ serviceOrderId: serviceOrder.id, applyLoyaltyDiscount }, {
                              onSuccess: (data) => {
                                showToast({
                                  title: 'Factură creată',
                                  description: `Factura ${data.invoiceNumber} a fost creată cu succes.`,
                                  type: 'success',
                                });
                                window.location.href = '/crm/invoices';
                              },
                              onError: (error) => {
                                showToast({
                                  title: 'Eroare',
                                  description: error.message || 'Nu s-a putut crea factura.',
                                  type: 'error',
                                });
                              },
                            });
                          }}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="mr-2 inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {createInvoiceMutation.isPending ? 'Se creează...' : 'Creează Factură'}
                        </button>
                      </div>
                      {/* Loyalty discount toggle — only shown when client has an active tier discount */}
                      {getLoyaltyDiscountPercent() > 0 && (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={applyLoyaltyDiscount}
                            onChange={(e) => setApplyLoyaltyDiscount(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-xs text-gray-700">
                            Aplică reducere fidelitate{' '}
                            <span className="font-semibold text-green-700">
                              {loyaltyAccount?.currentTier} (-{getLoyaltyDiscountPercent()}%)
                            </span>
                          </span>
                        </label>
                      )}
                    </div>
                  )}

                  {selectedAppointment.status !== 'COMPLETED' && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={cancelMutation.isPending}
                        onClick={() =>
                          cancelMutation.mutate(
                            { appointmentId: selectedAppointment.id },
                            {
                              onSuccess: () => {
                                showToast({ title: 'Programarea a fost anulata', type: 'warning' });
                                queryClient.invalidateQueries({ queryKey: ['appointments'] });
                              },
                              onError: (error) => {
                                showToast({ title: 'Programarea nu a putut fi anulata', description: error?.message, type: 'error' });
                              },
                            }
                          )
                        }
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Anuleaza programarea
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex h-[calc(100%-120px)] flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                    Nu exista mesaje deocamdata. Scrie primul mesaj mai jos.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isOwnMessage = message.authorId === user?.id;
                      const isClientMessage = message.author?.type === 'client';
                      const authorName = message.author?.firstName
                        ? `${message.author.firstName} ${message.author.lastName || ''}`
                        : isClientMessage ? 'Client' : 'Utilizator';
                      const isVoice = message.metadata?.isVoice;
                      const hasAttachments = message.attachments?.length > 0;

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {/* Avatar */}
                          <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isClientMessage ? 'bg-blue-100' : 'bg-primary/10'}`}>
                            <User size={14} className={isClientMessage ? 'text-blue-600' : 'text-primary'} />
                          </div>

                          {/* Message content */}
                          <div className={`max-w-[75%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                            {/* Author and time */}
                            <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="text-xs font-medium text-gray-700">{authorName}</span>
                              <span className="text-xs text-gray-400">
                                {formatDateTime(message.createdAt, 'HH:mm')}
                              </span>
                            </div>

                            {/* Message bubble */}
                            <div className={`rounded-2xl px-4 py-2 ${isOwnMessage ? 'bg-primary text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}`}>
                              {/* Text content */}
                              {message.body && !isVoice && (
                                <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                              )}

                              {/* Voice message */}
                              {isVoice && hasAttachments && (
                                <div className="flex items-center gap-3 min-w-[180px]">
                                  <audio
                                    controls
                                    src={getFileUrl(message.attachments[0].fileUrl)}
                                    className="h-8 w-full"
                                    style={{ maxWidth: '200px' }}
                                  />
                                </div>
                              )}

                              {/* File attachments */}
                              {!isVoice && hasAttachments && message.attachments.map((attachment) => {
                                const isImage = attachment.fileType?.startsWith('image/');
                                const fullUrl = getFileUrl(attachment.fileUrl);
                                return (
                                  <div key={attachment.id} className="mt-2">
                                    {isImage ? (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewFile({ url: fullUrl, name: attachment.fileName, type: attachment.fileType })}
                                        className="block cursor-pointer hover:opacity-90 transition-opacity"
                                      >
                                        <img
                                          src={fullUrl}
                                          alt={attachment.fileName}
                                          className="max-w-[200px] max-h-[150px] rounded-lg object-cover"
                                        />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setPreviewFile({ url: fullUrl, name: attachment.fileName, type: attachment.fileType })}
                                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${isOwnMessage ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-200 hover:bg-gray-300'}`}
                                      >
                                        <FileText size={16} />
                                        <span className="text-xs truncate max-w-[140px]">{attachment.fileName}</span>
                                        <ImageIcon size={14} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Typing Indicators */}
              {typingUsers.size > 0 && (
                <div className="border-t border-gray-100 px-6 py-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="flex gap-1">
                      <span className="animate-bounce inline-block h-1.5 w-1.5 rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                      <span className="animate-bounce inline-block h-1.5 w-1.5 rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                      <span className="animate-bounce inline-block h-1.5 w-1.5 rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>
                      {Array.from(typingUsers.values()).map((u, idx, arr) => (
                        <span key={u.firstName + u.lastName}>
                          {u.firstName} {u.lastName}
                          {idx < arr.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                      {' '}{typingUsers.size === 1 ? 'scrie' : 'scriu'}...
                    </span>
                  </div>
                </div>
              )}

              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const trimmed = messageDraft.trim();
                  if (!trimmed || !selectedAppointmentId || isSendingMessage) return;

                  setIsSendingMessage(true);
                  setSendError(null);

                  // Stop typing indicator
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                  sendTypingStatus(selectedAppointmentId, false);

                  const originalMessage = messageDraft;
                  setMessageDraft('');

                  try {
                    await sendMessage({ body: trimmed });
                    // Scroll to bottom after sending
                    setTimeout(() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  } catch (error) {
                    console.error('Failed to send message:', error);
                    const errorMsg = getErrorMessage(error, 'Nu am putut trimite mesajul');
                    setSendError(errorMsg);
                    setMessageDraft(originalMessage);
                    showToast({
                      title: 'Mesajul nu a putut fi trimis',
                      description: errorMsg,
                      type: 'error'
                    });
                  } finally {
                    setIsSendingMessage(false);
                  }
                }}
                className="border-t px-6 py-4"
              >
                {sendError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start justify-between">
                    <span>{sendError}</span>
                    <button
                      type="button"
                      onClick={() => setSendError(null)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Pending file preview */}
                {pendingFile && (
                  <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-start gap-3">
                      {pendingFile.type?.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(pendingFile)}
                          alt={pendingFile.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                          <FileText size={24} className="text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{pendingFile.name}</p>
                        <p className="text-xs text-gray-500">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPendingFile(null)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
                        >
                          <X size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={uploadingFile}
                          onClick={async () => {
                            try {
                              await uploadFile(pendingFile);
                              setPendingFile(null);
                              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                            } catch (error) {
                              showToast({ title: 'Eroare', description: 'Nu am putut incarca fisierul', type: 'error' });
                            }
                          }}
                          className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                          {uploadingFile ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  {/* File upload button */}
                  <label className="cursor-pointer p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx,.txt"
                      disabled={isSendingMessage || uploadingFile || !!pendingFile}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          showToast({ title: 'Fisier prea mare', description: 'Maxim 10MB permis', type: 'error' });
                          e.target.value = '';
                          return;
                        }
                        setPendingFile(file);
                        e.target.value = '';
                      }}
                    />
                    {uploadingFile ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Paperclip size={20} />
                    )}
                  </label>

                  {/* Voice record button - simplified inline recorder */}
                  <VoiceRecorder
                    onUpload={async (audioBlob, duration) => {
                      try {
                        await uploadVoice({ audioBlob, duration });
                        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                      } catch (error) {
                        showToast({ title: 'Eroare', description: 'Nu am putut incarca mesajul vocal', type: 'error' });
                      }
                    }}
                    disabled={isSendingMessage || uploadingVoice}
                    isUploading={uploadingVoice}
                  />

                  {/* Text input */}
                  <textarea
                    value={messageDraft}
                    onChange={(event) => handleMessageInputChange(event.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (messageDraft.trim() && !isSendingMessage) {
                          e.target.form.requestSubmit();
                        }
                      }
                    }}
                    placeholder="Scrie un mesaj..."
                    rows={1}
                    disabled={isSendingMessage}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
                    style={{ minHeight: '40px', maxHeight: '100px' }}
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !messageDraft.trim()}
                    className="p-2.5 rounded-lg bg-primary text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingMessage ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Add Payment Modal */}
      {isPaymentModalOpen && paymentStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Adauga plata</h3>
              <p className="mt-1 text-sm text-gray-500">Inregistreaza o noua plata pentru aceasta programare</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Summary */}
              <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total comenzi:</span>
                  <span className="font-semibold text-gray-900">{currencyFormatter.format(Number(paymentStatus.total || 0))}</span>
                </div>
                {/* Loyalty discount from invoice */}
                {paymentStatus.loyaltyDiscount > 0 && (
                  <div className="flex items-center justify-between text-green-700">
                    <span>Reducere fidelitate{paymentStatus.loyaltyTierAtTime ? ` (${paymentStatus.loyaltyTierAtTime})` : ''}:</span>
                    <span>-{currencyFormatter.format(Number(paymentStatus.loyaltyDiscount))}</span>
                  </div>
                )}
                {/* Potential loyalty discount (no invoice yet but client has tier) */}
                {!paymentStatus.loyaltyDiscount && getLoyaltyDiscountPercent() > 0 && (
                  <p className="text-xs text-amber-600">
                    Reducere fidelitate {loyaltyAccount?.currentTier} (-{getLoyaltyDiscountPercent()}%) se va aplica la crearea facturii.
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total platit:</span>
                  <span className="font-medium text-green-700">{currencyFormatter.format(Number(paymentStatus.totalPaid || 0))}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-medium text-gray-700">Rest de plata:</span>
                  <span className="font-bold text-orange-600">{currencyFormatter.format(Number(paymentStatus.remaining || 0))}</span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Suma <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="paymentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">RON</span>
                </div>
                {paymentForm.amount && paymentStatus && (
                  <p className="mt-1 text-xs text-gray-500">
                    Rest dupa plata: {currencyFormatter.format(Math.max(0, Number(paymentStatus.remaining || 0) - parseFloat(paymentForm.amount || 0)))}
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                  Metoda de plata <span className="text-red-500">*</span>
                </label>
                <select
                  id="paymentMethod"
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="CASH">Numerar</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Transfer bancar</option>
                  <option value="OTHER">Altele</option>
                </select>
              </div>

              {/* Reference (Optional) */}
              <div>
                <label htmlFor="paymentReference" className="block text-sm font-medium text-gray-700 mb-1">
                  Referinta (optional)
                </label>
                <input
                  id="paymentReference"
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Nr. chitanta, ID tranzactie, etc."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Notes (Optional) */}
              <div>
                <label htmlFor="paymentNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notite (optional)
                </label>
                <textarea
                  id="paymentNotes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Detalii suplimentare despre plata..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setPaymentForm({
                    amount: '',
                    paymentMethod: 'CASH',
                    notes: '',
                    reference: '',
                  });
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Anuleaza
              </button>
              <button
                type="button"
                onClick={handleAddPayment}
                disabled={!paymentForm.amount || parseFloat(paymentForm.amount) <= 0 || isRecordingPayment}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRecordingPayment && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isRecordingPayment ? 'Se înregistrează...' : 'Adauga plata'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{previewFile.name}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download size={16} />
                  Descarca
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-auto max-h-[calc(90vh-60px)] flex items-center justify-center bg-gray-100">
              {previewFile.type?.startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : previewFile.type === 'application/pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  className="w-full h-[70vh] rounded-lg"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Previzualizare indisponibila pentru acest tip de fisier</p>
                  <a
                    href={previewFile.url}
                    download={previewFile.name}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Download size={18} />
                    Descarca fisierul
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
