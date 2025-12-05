import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, X, Send, Plus, Trash2, FileText, CheckCircle2, Clock, AlertCircle, Edit2, Save } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import roCalendarLocale from '@fullcalendar/core/locales/ro';
import { useAppointments } from '../hooks/useAppointments.js';
import { useAppointment, useCancelAppointment, useUpdateAppointment } from '../hooks/useAppointment.js';
import { useAppointmentMessages } from '../hooks/useAppointmentMessages.js';
import { useServiceOrder, useSaveServiceOrder } from '../hooks/useServiceOrder.js';
import { useCreateInvoice } from '../hooks/useInvoices.js';
import useUsers from '../hooks/useUsers.js';
import { useCompanySettings } from '../hooks/useCompanySettings.js';
import DatePicker from '../components/ui/DatePicker.jsx';
import ClientAutocomplete from '../components/ui/ClientAutocomplete.jsx';
import Pagination from '../components/Pagination.jsx';
import ExportButton from '../components/ExportButton.jsx';
import useToast from '../context/useToast';
import useAuth from '../context/useAuth';
import { USER_ROLES } from '../utils/constants.js';
import { getErrorMessage } from '../utils/errorUtils.js';
import { createAppointment, downloadServiceOrderPdf } from '../services/appointmentService';
import { recordAdvancePayment, recordFinalPayment, getPaymentStatus } from '../services/paymentService';
import API from '../utils/api.js';
import { getSocket } from '../lib/socket.js';

const formatDateTime = (value, pattern = 'Pp') =>
  value ? format(new Date(value), pattern, { locale: roDateLocale }) : '';

const currencyFormatter = new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' });
const numberFormatter = new Intl.NumberFormat('ro-RO');

const STATUS_FILTERS = [
  { label: 'Toate', value: undefined },
  { label: 'In asteptare', value: 'pending' },
  { label: 'Prezentat', value: 'prezentat' },
  { label: 'In desfasurare', value: 'in_progress' },
  { label: 'Finalizate', value: 'completed' },
  { label: 'Anulate', value: 'cancelled' },
];

const STATUS_META = {
  PENDING: { label: 'In asteptare', badgeClass: 'border border-yellow-400 bg-yellow-50 text-yellow-800', calendarClass: 'status-pending' },
  PREZENTAT: { label: 'Prezentat', badgeClass: 'border border-blue-400 bg-blue-50 text-blue-900', calendarClass: 'status-prezentat' },
  IN_PROGRESS: { label: 'In desfasurare', badgeClass: 'border border-amber-400 bg-amber-50 text-amber-900', calendarClass: 'status-in-progress' },
  COMPLETED: { label: 'Finalizata', badgeClass: 'border border-emerald-400 bg-emerald-50 text-emerald-900', calendarClass: 'status-completed' },
  CANCELLED: { label: 'Anulata', badgeClass: 'border border-red-400 bg-red-50 text-red-800', calendarClass: 'status-cancelled' },
};

const STATUS_LABELS = {
  pending: STATUS_META.PENDING.label,
  prezentat: STATUS_META.PREZENTAT.label,
  'in-progress': STATUS_META.IN_PROGRESS.label,
  'in_progress': STATUS_META.IN_PROGRESS.label,
  completed: STATUS_META.COMPLETED.label,
  cancelled: STATUS_META.CANCELLED.label,
};

const STATUS_SEQUENCE = ['PENDING', 'PREZENTAT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const PAYMENT_STATUS_META = {
  UNPAID: { label: 'Neplatit', badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300', icon: Clock },
  PARTIAL: { label: 'Partial platit', badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-300', icon: AlertCircle },
  PAID: { label: 'Platit complet', badgeClass: 'bg-green-100 text-green-800 border border-green-300', icon: CheckCircle2 },
};

const getPaymentStatusMeta = (status) => {
  return PAYMENT_STATUS_META[status] || PAYMENT_STATUS_META.UNPAID;
};

const getStatusMeta = (value) => {
  if (!value) {
    return { label: 'Necunoscut', badgeClass: 'border border-gray-200 bg-gray-100 text-gray-600', calendarClass: 'status-unknown' };
  }
  const normalized = value.toString().toUpperCase().replace(/-/g, '_');
  return STATUS_META[normalized] || {
    label: value,
    badgeClass: 'border border-gray-200 bg-gray-100 text-gray-600',
    calendarClass: 'status-unknown',
  };
};

const defaultForm = {
  title: '',
  description: '',
  scheduledDate: null,
  startTime: '09:00',
  endTime: '10:00',
  assigneeIds: [],
  clientId: '',
  vehicleId: '',
  advancePayment: '',
};

const defaultClientForm = {
  type: 'PF',
  firstName: '',
  lastName: '',
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  vatNumber: '',
  registrationNumber: '',
  notes: '',
  fidelityCardSerie: '',
};

const defaultVehicleForm = {
  make: '',
  model: '',
  year: '',
  plateNumber: '',
  vin: '',
  odometerKm: '',
  color: '',
  notes: '',
};

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

const normalizeRoleKey = (value) => (typeof value === 'string' ? value.toLowerCase().replace(/\s+/g, '-') : '');

const extractRoleKeys = (person) => {
  const keys = new Set();
  if (!person) return keys;
  const primary = normalizeRoleKey(person.role);
  if (primary) {
    keys.add(primary);
  }
  person.roles?.forEach((assignment) => {
    const key = normalizeRoleKey(assignment?.role?.key || assignment?.key || assignment?.role);
    if (key) {
      keys.add(key);
    }
  });
  return keys;
};

const createDefaultOrderDraft = () => ({
  notes: '',
  lineItems: [{ name: '', description: '', hardwareQuantity: 1, laborQuantity: 1, hardwarePrice: 0, laborPrice: 0, hardwareUnit: '', laborUnit: '' }],
});

const HARDWARE_UNITS = [
  { value: 'buc', label: 'buc (bucati)' },
  { value: 'set', label: 'set' },
  { value: 'pereche', label: 'pereche' },
  { value: 'm', label: 'm (metri)' },
  { value: 'm²', label: 'm² (metri patrati)' },
  { value: 'l', label: 'l (litri)' },
  { value: 'kg', label: 'kg (kilograme)' },
  { value: 'pachet', label: 'pachet' },
];

const LABOR_UNITS = [
  { value: 'ore', label: 'ore' },
  { value: 'ore/om', label: 'ore/om (om-ore)' },
  { value: 'zile', label: 'zile' },
  { value: 'interventie', label: 'interventie' },
];

const combineDateAndTime = (date, time) => {
  if (!date || !time) return null;
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  const result = new Date(date);
  result.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return result;
};

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
  const [vehicleForm, setVehicleForm] = useState(defaultVehicleForm);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showManualClientEntry, setShowManualClientEntry] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [orderDraft, setOrderDraft] = useState(createDefaultOrderDraft);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isAdvancePaymentModalOpen, setIsAdvancePaymentModalOpen] = useState(false);
  const [isFinalPaymentModalOpen, setIsFinalPaymentModalOpen] = useState(false);
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(false);
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [editForm, setEditForm] = useState({});
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const modalRef = useRef(null);
  const calendarRef = useRef(null);
  const pendingPdfWindowRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  const resetCreateForm = useCallback(() => {
    setFormState(defaultForm);
    setClientForm(defaultClientForm);
    setVehicleForm(defaultVehicleForm);
    setOrderDraft(createDefaultOrderDraft());
    setFormErrors([]);
    setSelectedClient(null);
    setSelectedVehicle(null);
    setShowManualClientEntry(false);
  }, []);

  /**
   * Handle client selection from autocomplete
   */
  const handleClientSelect = useCallback((client, vehicle) => {
    setSelectedClient(client);
    setSelectedVehicle(vehicle);
    setShowManualClientEntry(false);

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

    // Auto-fill vehicle form with selected vehicle (most recent by default)
    if (vehicle) {
      setVehicleForm({
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        plateNumber: vehicle.plateNumber || '',
        vin: vehicle.vin || '',
        carId: vehicle.carId || '',
        odometerKm: vehicle.odometerKm || '',
        color: vehicle.color || '',
        notes: vehicle.notes || '',
      });
    }
  }, []);

  /**
   * Handle vehicle selection from dropdown
   */
  const handleVehicleSelect = useCallback((vehicleId) => {
    if (!selectedClient || !selectedClient.vehicles) return;

    if (vehicleId === 'new') {
      // Clear vehicle form for new vehicle entry
      setVehicleForm(defaultVehicleForm);
      setSelectedVehicle(null);
      return;
    }

    const vehicle = selectedClient.vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      setVehicleForm({
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        plateNumber: vehicle.plateNumber || '',
        vin: vehicle.vin || '',
        carId: vehicle.carId || '',
        odometerKm: vehicle.odometerKm || '',
        color: vehicle.color || '',
        notes: vehicle.notes || '',
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
  const { data: allAppointments = [], meta, loading: isLoading, page, setPage } = useAppointments({}, { enablePagination: true });
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
  const { messages, sending, sendMessage, loading: messagesLoading } = useAppointmentMessages(selectedAppointmentId || undefined);
  const { data: serviceOrder, isLoading: orderLoading } = useServiceOrder(selectedAppointmentId || undefined);
  const saveOrderMutation = useSaveServiceOrder(selectedAppointmentId || undefined);
  const cancelMutation = useCancelAppointment();
  const updateMutation = useUpdateAppointment();
  const createInvoiceMutation = useCreateInvoice();
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
       if (calendarRef.current && data?.scheduledStart) {
         const api = calendarRef.current.getApi();
         api.gotoDate(new Date(data.scheduledStart));
       }
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
    (requireConfirm = false) => {
      if (isSaving) {
        return;
      }
      if (requireConfirm) {
        const confirmed = window.confirm('Datele completate vor fi pierdute. Sigur vrei sa inchizi?');
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
              hardwarePrice: item.hardwarePrice !== undefined ? item.hardwarePrice : (item.unitPrice || 0),
              laborPrice: item.laborPrice || 0,
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
   * Fetch unread count and payment status when appointment drawer opens
   */
  useEffect(() => {
    if (selectedAppointmentId) {
      fetchUnreadCount(selectedAppointmentId);
      fetchPaymentStatus(selectedAppointmentId);
    } else {
      setUnreadCount(0);
      setTypingUsers(new Map());
      setPaymentStatus(null);
    }
  }, [selectedAppointmentId, fetchUnreadCount, fetchPaymentStatus]);

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

  const handleRecordAdvancePayment = async () => {
    if (!selectedAppointmentId || !advancePaymentAmount) return;

    const amount = parseFloat(advancePaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast({ title: 'Suma nu este valida', type: 'error' });
      return;
    }

    const total = paymentStatus?.total || 0;
    if (amount > total) {
      showToast({ title: 'Suma avansului nu poate depasi totalul', type: 'error' });
      return;
    }

    try {
      await recordAdvancePayment(selectedAppointmentId, amount);
      showToast({ title: 'Avans inregistrat cu succes', type: 'success' });
      setIsAdvancePaymentModalOpen(false);
      setAdvancePaymentAmount('');
      fetchPaymentStatus(selectedAppointmentId);
      queryClient.invalidateQueries({ queryKey: ['appointment', selectedAppointmentId] });
      queryClient.invalidateQueries({ queryKey: ['service-order', selectedAppointmentId] });
    } catch (error) {
      showToast({
        title: 'Nu am putut inregistra avansul',
        description: error?.message || 'Incearca din nou.',
        type: 'error',
      });
    }
  };

  const handleRecordFinalPayment = async () => {
    if (!selectedAppointmentId || !paymentStatus) return;

    const remainingAmount = paymentStatus.remaining || 0;
    if (remainingAmount <= 0) {
      showToast({ title: 'Nu exista suma ramasa de platit', type: 'error' });
      return;
    }

    try {
      await recordFinalPayment(selectedAppointmentId, remainingAmount);
      showToast({ title: 'Plata finalizata cu succes', type: 'success' });
      setIsFinalPaymentModalOpen(false);
      fetchPaymentStatus(selectedAppointmentId);
      queryClient.invalidateQueries({ queryKey: ['appointment', selectedAppointmentId] });
      queryClient.invalidateQueries({ queryKey: ['service-order', selectedAppointmentId] });
    } catch (error) {
      showToast({
        title: 'Nu am putut finaliza plata',
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

    console.log('📋 ORDER DRAFT LINE ITEMS:', orderDraft.lineItems);
    console.log('✂️ TRIMMED ITEMS:', trimmedItems);

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

    const payload = {
      title,
      description: formState.description?.trim() || undefined,
      scheduledStart: startDateTime ? startDateTime.toISOString() : undefined,
      scheduledEnd: endDateTime ? endDateTime.toISOString() : undefined,
      assigneeIds: Array.from(new Set(formState.assigneeIds)),
      clientId: formState.clientId || undefined,
      vehicleId: formState.vehicleId || undefined,
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
      vehicle: {
        make: vehicleForm.make?.trim() || undefined,
        model: vehicleForm.model?.trim() || undefined,
        year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
        plateNumber: vehicleForm.plateNumber?.trim() || undefined,
        vin: vehicleForm.vin?.trim() || undefined,
        odometerKm: vehicleForm.odometerKm ? Number(vehicleForm.odometerKm) : undefined,
        color: vehicleForm.color?.trim() || undefined,
        notes: vehicleForm.notes?.trim() || undefined,
      },
      serviceOrder: {
        notes: orderDraft.notes?.trim() || undefined,
        lineItems: trimmedItems.map((item) => ({
          name: item.name,
          description: item.description || undefined,
          hardwareQuantity: Number(item.hardwareQuantity) >= 0 ? Number(item.hardwareQuantity) : 1,
          laborQuantity: Number(item.laborQuantity) >= 0 ? Number(item.laborQuantity) : 1,
          hardwarePrice: Number(item.hardwarePrice) || 0,
          laborPrice: Number(item.laborPrice) || 0,
          hardwareUnit: item.hardwareUnit?.trim() || undefined,
          laborUnit: item.laborUnit?.trim() || undefined,
        })),
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
        const colors = getStatusColors(appointment.status);
        const classList = ['fc-appointment', meta.calendarClass];
        if (appointment.id === selectedAppointmentId) {
          classList.push('is-selected');
        }
        return {
          id: appointment.id,
          title: appointment.title || 'Programare',
          start: appointment.scheduledStart,
          end: appointment.scheduledEnd,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          classNames: classList,
          extendedProps: {
            status: appointment.status,
            client: appointment.client,
            assignees: appointment.assignees,
          },
        };
      }),
    [appointments, selectedAppointmentId]
  );

  const handleDateClick = (info) => {
    const today = startOfDay(new Date());
    const clickedDate = startOfDay(info.date);
    if (isBefore(clickedDate, today)) {
      showToast({ title: 'Nu poti crea programari in trecut', type: 'warning' });
      return;
    }
    openCreateModal(info.date);
  };

  const handleEventClick = (info) => {
    info.jsEvent.preventDefault();
    if (info.event.id) {
      setSelectedAppointmentId(info.event.id);
      setActiveTab('details');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Programari</h1>
          <p className="text-sm text-gray-500">
            Gestioneaza programarile atelierului, echipa alocata si statusul lucrarilor in timp real.
          </p>
        </div>
        <div className="flex gap-2">
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
            className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white hover:bg-viperx-primary/90 transition-colors"
          >
            Programare noua
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 self-center">Status:</span>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-full border px-4 py-1 text-xs font-medium transition-colors ${
                status === filter.value
                  ? 'border-viperx-primary bg-viperx-primary/10 text-viperx-primary'
                  : 'border-gray-200 text-gray-600 hover:border-viperx-primary/40 hover:text-viperx-primary'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">Client:</label>
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value || undefined)}
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
            <label className="text-xs font-medium text-gray-500">Responsabil:</label>
            <select
              value={selectedAssigneeId || ''}
              onChange={(e) => setSelectedAssigneeId(e.target.value || undefined)}
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
              className="text-xs text-gray-500 hover:text-viperx-primary transition-colors underline"
            >
              Reseteaza filtrele
            </button>
          )}
        </div>
      </div>
      {companySettings?.rampCount ? (
        <p className="text-xs text-gray-500">Rampe configurate: {companySettings.rampCount}</p>
      ) : null}

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">Se incarca programarile...</div>
        ) : (
          <>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              height={750}
              weekends
              locales={[roCalendarLocale]}
              locale="ro"
              events={calendarEvents}
              eventDisplay="block"
              eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              headerToolbar={{
                left: 'title',
                center: 'dayGridMonth,timeGridWeek,timeGridDay',
                right: 'prev,next today'
              }}
              buttonText={{
                today: 'Astazi',
                month: 'Luna',
                week: 'Saptamana',
                day: 'Zi'
              }}
              titleFormat={{ month: 'long', year: 'numeric' }}
              dayMaxEvents={5}
              slotMinTime="06:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              eventContent={(arg) => {
                const event = arg.event;
                return (
                  <div className="w-full overflow-hidden px-1">
                    <div className="text-[11px] font-medium opacity-90">{arg.timeText}</div>
                    <div className="truncate text-xs font-semibold">{event.title}</div>
                  </div>
                );
              }}
              dayHeaderClassNames={() => ['!text-[11px]', '!font-semibold', '!uppercase', '!tracking-wide', '!text-gray-400']}
              dayCellClassNames={({ isToday }) => {
                const classes = ['!border-0', '!p-1', '!align-top', 'fc-daygrid-day-viperx'];
                if (isToday) {
                  classes.push('!bg-viperx-primary/5', '!rounded-lg');
                }
                return classes;
              }}
              eventClassNames={() => ['cursor-pointer']}
            />
            {calendarEvents.length === 0 ? (
              <p className="mt-4 text-center text-sm text-gray-400">Nu exista programari pentru filtrul selectat.</p>
            ) : null}
          </>
        )}
      </div>

      {/* Pagination */}
      {meta && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          totalItems={meta.total}
          pageSize={meta.limit}
        />
      )}

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
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                      <label className="block text-sm font-medium text-gray-700">Ora inceput *</label>
                      <select
                        value={formState.startTime}
                        onChange={(event) => setFormState((prev) => ({ ...prev, startTime: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                        required
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Ora final *</label>
                      <select
                        value={formState.endTime}
                        onChange={(event) => setFormState((prev) => ({ ...prev, endTime: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                        required
                      >
                        {TIME_OPTIONS.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Descriere</label>
                  <textarea
                    value={formState.description}
                    onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                              ? 'border-viperx-primary bg-viperx-primary/10 text-viperx-primary'
                              : 'border-gray-200 text-gray-600 hover:border-viperx-primary/40 hover:text-viperx-primary'
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
                        setSelectedVehicle(null);
                        setClientForm(defaultClientForm);
                        setVehicleForm(defaultVehicleForm);
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

                            {selectedClient.vehicles && selectedClient.vehicles.length > 0 && (
                              <div className="mt-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Selecteaza vehicul:
                                </label>
                                <select
                                  value={selectedVehicle?.id || ''}
                                  onChange={(e) => handleVehicleSelect(e.target.value)}
                                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {selectedClient.vehicles.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                      {vehicle.plateNumber || 'Fara nr'} - {vehicle.make} {vehicle.model}
                                      {vehicle.year && ` (${vehicle.year})`}
                                    </option>
                                  ))}
                                  <option value="new">+ Adauga vehicul nou</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClient(null);
                              setSelectedVehicle(null);
                              setClientForm(defaultClientForm);
                              setVehicleForm(defaultVehicleForm);
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
                                ? 'border-viperx-primary bg-viperx-primary/10 text-viperx-primary'
                                : 'border-gray-200 text-gray-600 hover:border-viperx-primary/40 hover:text-viperx-primary'
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
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Persoana de contact</label>
                          <input
                            type="text"
                            value={clientForm.contactName}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, contactName: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">CUI *</label>
                          <input
                            type="text"
                            value={clientForm.vatNumber}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, vatNumber: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nr. registru comert</label>
                          <input
                            type="text"
                            value={clientForm.registrationNumber}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, registrationName: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Nume *</label>
                          <input
                            type="text"
                            value={clientForm.lastName}
                            onChange={(event) => setClientForm((prev) => ({ ...prev, lastName: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefon</label>
                      <input
                        type="tel"
                        value={clientForm.phone}
                        onChange={(event) => setClientForm((prev) => ({ ...prev, phone: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Serie card fidelitate</label>
                      <input
                        type="text"
                        value={clientForm.fidelityCardSerie}
                        onChange={(event) => setClientForm((prev) => ({ ...prev, fidelityCardSerie: event.target.value }))}
                        placeholder="FL123456"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Note client</label>
                      <textarea
                        value={clientForm.notes}
                        onChange={(event) => setClientForm((prev) => ({ ...prev, notes: event.target.value }))}
                        rows={2}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900">Detalii vehicul</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <p className="md:col-span-2 text-xs text-gray-500">Completeaza cel putin numarul de inmatriculare sau VIN.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Marca</label>
                    <input
                      type="text"
                      value={vehicleForm.make}
                      onChange={(event) => setVehicleForm((prev) => ({ ...prev, make: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Model</label>
                    <input
                      type="text"
                      value={vehicleForm.model}
                      onChange={(event) => setVehicleForm((prev) => ({ ...prev, model: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">An</label>
                    <input
                      type="number"
                      value={vehicleForm.year}
                      onChange={(event) => setVehicleForm((prev) => ({ ...prev, year: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Numar inmatriculare</label>
                    <input
                      type="text"
                      value={vehicleForm.plateNumber}
                      onChange={(event) => setVehicleForm((prev) => ({ ...prev, plateNumber: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">VIN</label>
                    <input
                      type="text"
                      value={vehicleForm.vin}
                      onChange={(event) => setVehicleForm((prev) => ({ ...prev, vin: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kilometraj (km)</label>
                    <input
                      type="number"
                      value={vehicleForm.odometerKm}
                      onChange={(event) => setVehicleForm((prev) => ({ ...prev, odometerKm: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Culoare</label>
                    <input
                      type="text"
                      value={vehicleForm.color}
                      onChange={(event) => setVehicleForm((prev) => ({ ...prev, color: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Note vehicul</label>
                    <textarea
                      value={vehicleForm.notes}
                      onChange={(event) => setVehicleForm((prev) => ({ ...prev, notes: event.target.value }))}
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Articole comanda service</h3>
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
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                            placeholder="Detalii suplimentare"
                          />
                        </div>

                        {/* Split sections for Hardware and Labor */}
                        <div className="grid gap-3 md:grid-cols-2">
                          {/* Hardware Section */}
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
                                    className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-viperx-primary focus:outline-none"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-600 mb-1">Unitate</label>
                                  <select
                                    value={item.hardwareUnit || ''}
                                    onChange={(event) => handleLineItemChange(index, 'hardwareUnit', event.target.value)}
                                    className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-viperx-primary focus:outline-none"
                                  >
                                    <option value="">—</option>
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
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-viperx-primary focus:outline-none"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>

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
                                    className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm focus:border-viperx-primary focus:outline-none"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-600 mb-1">Unitate</label>
                                  <select
                                    value={item.laborUnit || ''}
                                    onChange={(event) => handleLineItemChange(index, 'laborUnit', event.target.value)}
                                    className="w-full rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-viperx-primary focus:outline-none"
                                  >
                                    <option value="">—</option>
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
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-viperx-primary focus:outline-none"
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
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-viperx-primary hover:bg-viperx-primary/5 hover:text-viperx-primary"
                  >
                    <Plus size={16} /> Adauga articol/serviciu
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 text-sm text-gray-700 sm:flex-row sm:items-start sm:justify-between">
                  <div className="text-sm text-gray-700">
                    <label className="block text-sm font-medium text-gray-700">Note comanda</label>
                    <textarea
                      value={orderDraft.notes}
                      onChange={(event) => setOrderDraft((prev) => ({ ...prev, notes: event.target.value }))}
                      rows={2}
                      className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none"
                    />
                  </div>
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                  className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:opacity-50"
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-viperx-primary bg-viperx-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-viperx-primary/90 transition-colors disabled:opacity-50"
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
                activeTab === 'details' ? 'text-viperx-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Detalii
              {activeTab === 'details' && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-viperx-primary" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`relative px-4 py-3 text-sm font-medium transition ${
                activeTab === 'messages' ? 'text-viperx-primary' : 'text-gray-500 hover:text-gray-700'
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
              {activeTab === 'messages' && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-viperx-primary" />}
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
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                            <select
                              value={editForm.startTime || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                              required
                            >
                              {TIME_OPTIONS.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ora final *</label>
                            <select
                              value={editForm.endTime || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                              required
                            >
                              {TIME_OPTIONS.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
                          <textarea
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                              {selectedAppointment.status !== 'COMPLETED' ? (
                                <div className="relative">
                                  <select
                                    value={selectedAppointment.status || 'PENDING'}
                                    disabled={updateMutation.isPending}
                                    onChange={(event) => handleStatusChange(event.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
                                  >
                                    {STATUS_SEQUENCE.filter(s => s !== 'CANCELLED' || selectedAppointment.status !== 'COMPLETED').map((value) => (
                                      <option key={value} value={value}>
                                        {getStatusMeta(value).label}
                                      </option>
                                    ))}
                                  </select>
                                  {updateMutation.isPending && (
                                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-viperx-primary"></div>
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
                              : `${selectedAppointment.client.firstName || ''} ${selectedAppointment.client.lastName || ''}`.trim() || selectedAppointment.client.contactName || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Persoana de contact</dt>
                          <dd className="font-medium text-gray-900">
                            {selectedAppointment.client.contactName || `${selectedAppointment.client.firstName || ''} ${selectedAppointment.client.lastName || ''}`.trim() || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Telefon</dt>
                          <dd className="font-medium text-gray-900">{selectedAppointment.client.phone || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Email</dt>
                          <dd className="font-medium text-gray-900">{selectedAppointment.client.email || '—'}</dd>
                        </div>
                        {selectedAppointment.client.type === 'SRL' ? (
                          <>
                            <div>
                              <dt className="text-gray-500">CUI</dt>
                              <dd className="font-medium text-gray-900">{selectedAppointment.client.vatNumber || '—'}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-500">Nr. registru comert</dt>
                              <dd className="font-medium text-gray-900">{selectedAppointment.client.registrationNumber || '—'}</dd>
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
                    <h3 className="text-base font-semibold text-gray-900">Vehicul</h3>
                    {selectedAppointment.vehicle ? (
                      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div>
                          <dt className="text-gray-500">Vehicul</dt>
                          <dd className="font-medium text-gray-900">
                            {`${selectedAppointment.vehicle.make || ''} ${selectedAppointment.vehicle.model || ''}`.trim() || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">An</dt>
                          <dd className="font-medium text-gray-900">{selectedAppointment.vehicle.year || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Nr. inmatriculare</dt>
                          <dd className="font-medium text-gray-900">{selectedAppointment.vehicle.plateNumber || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">VIN</dt>
                          <dd className="font-medium text-gray-900">{selectedAppointment.vehicle.vin || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Kilometraj</dt>
                          <dd className="font-medium text-gray-900">
                            {selectedAppointment.vehicle.odometerKm
                              ? `${numberFormatter.format(selectedAppointment.vehicle.odometerKm)} km`
                              : '—'}
                          </dd>
                        </div>
                        {selectedAppointment.vehicle.notes ? (
                          <div className="md:col-span-2">
                            <dt className="text-gray-500">Observatii</dt>
                            <dd className="text-gray-700">{selectedAppointment.vehicle.notes}</dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">Nu exista informatii despre vehicul.</p>
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
                                  ? 'border-viperx-primary bg-viperx-primary/10 text-viperx-primary'
                                  : 'border-gray-200 text-gray-600 hover:border-viperx-primary/40 hover:text-viperx-primary'
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
                              <div className="mr-1 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-viperx-primary"></div>
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
                        {selectedAppointment.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => setIsEditingOrder((prev) => !prev)}
                            className="rounded-lg bg-viperx-primary px-3 py-1 text-xs font-medium text-white transition hover:bg-viperx-primary/90"
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
                                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                                    placeholder="Detalii suplimentare despre serviciu"
                                  />
                                </div>

                                {/* Split sections for Hardware and Labor */}
                                <div className="grid gap-4 md:grid-cols-2">
                                  {/* Hardware Section */}
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
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-xs text-gray-600 mb-1">Unitate</label>
                                          <select
                                            value={item.hardwareUnit || ''}
                                            onChange={(event) => handleLineItemChange(index, 'hardwareUnit', event.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-xs text-gray-600 mb-1">Unitate</label>
                                          <select
                                            value={item.laborUnit || ''}
                                            onChange={(event) => handleLineItemChange(index, 'laborUnit', event.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
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
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition hover:border-viperx-primary hover:bg-viperx-primary/5 hover:text-viperx-primary"
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
                            className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none"
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
                                      hardwarePrice: item.hardwarePrice !== undefined ? item.hardwarePrice : (item.unitPrice || 0),
                                      laborPrice: item.laborPrice || 0,
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
                              console.log('💾 Saving service order with payload:', payload);
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
                            className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:opacity-50"
                          >
                            {saveOrderMutation.isPending ? 'Se salveaza…' : 'Salveaza comanda'}
                          </button>
                        </div>
                      </div>
                    ) : serviceOrder ? (
                      <div className="mt-4 space-y-4">
                        <div className="space-y-3">
                          {serviceOrder.lineItems.map((item) => {
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
                        {serviceOrder.pdfUrl ? (
                          <div className="overflow-hidden rounded-xl border border-gray-200">
                            <div className="border-b bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                              <span>Vizualizare comanda de service</span>
                            </div>
                            <iframe
                              key={`pdf-${serviceOrder.id}-${serviceOrder.updatedAt || Date.now()}-${Math.random()}`}
                              title="Comanda de service"
                              src={serviceOrder.pdfUrl ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${serviceOrder.pdfUrl}?t=${new Date(serviceOrder.updatedAt || Date.now()).getTime()}&r=${Math.random()}#toolbar=0` : ''}
                              className="h-80 w-full rounded border border-gray-200 bg-white"
                            />
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between text-sm text-gray-700">
                          <span>Subtotal</span>
                          <span className="font-semibold text-gray-900">{currencyFormatter.format(Number(serviceOrder.subtotal || 0))}</span>
                        </div>
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
                      <h3 className="text-base font-semibold text-gray-900">Plata</h3>

                      {isLoadingPaymentStatus ? (
                        <div className="mt-3 flex items-center justify-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-viperx-primary"></div>
                        </div>
                      ) : paymentStatus ? (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Status:</span>
                            {(() => {
                              const meta = getPaymentStatusMeta(paymentStatus.status);
                              const Icon = meta.icon;
                              return (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeClass}`}>
                                  <Icon size={14} />
                                  {meta.label}
                                </span>
                              );
                            })()}
                          </div>

                          <dl className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <dt className="text-gray-500">Total de plata:</dt>
                              <dd className="font-semibold text-gray-900">{currencyFormatter.format(Number(paymentStatus.total || 0))}</dd>
                            </div>

                            {paymentStatus.advancePayment && (
                              <>
                                <div className="flex items-center justify-between border-t pt-2">
                                  <dt className="flex items-center gap-1.5 text-gray-500">
                                    <CheckCircle2 size={14} className="text-green-600" />
                                    Avans platit:
                                  </dt>
                                  <dd className="font-medium text-green-700">{currencyFormatter.format(Number(paymentStatus.advancePayment.amount || 0))}</dd>
                                </div>
                                {paymentStatus.advancePayment.paidAt && (
                                  <div className="flex items-center justify-between text-xs">
                                    <dt className="text-gray-400">Platit la:</dt>
                                    <dd className="text-gray-600">{formatDateTime(paymentStatus.advancePayment.paidAt, 'dd MMM yyyy, HH:mm')}</dd>
                                  </div>
                                )}
                              </>
                            )}

                            {paymentStatus.status === 'PARTIAL' && (
                              <div className="flex items-center justify-between border-t pt-2">
                                <dt className="font-medium text-gray-700">Rest de plata:</dt>
                                <dd className="font-bold text-orange-600">{currencyFormatter.format(Number(paymentStatus.remaining || 0))}</dd>
                              </div>
                            )}

                            {paymentStatus.status === 'PAID' && paymentStatus.finalPayment && (
                              <>
                                <div className="flex items-center justify-between border-t pt-2">
                                  <dt className="flex items-center gap-1.5 text-gray-500">
                                    <CheckCircle2 size={14} className="text-green-600" />
                                    Plata completa
                                  </dt>
                                  <dd className="font-semibold text-green-700">{currencyFormatter.format(Number(paymentStatus.total || 0))}</dd>
                                </div>
                                {paymentStatus.finalPayment?.paidAt && (
                                  <div className="flex items-center justify-between text-xs">
                                    <dt className="text-gray-400">Finalizat la:</dt>
                                    <dd className="text-gray-600">{formatDateTime(paymentStatus.finalPayment.paidAt, 'dd MMM yyyy, HH:mm')}</dd>
                                  </div>
                                )}
                              </>
                            )}
                          </dl>

                          {selectedAppointment.status !== 'COMPLETED' && (
                            <div className="flex gap-2 border-t pt-3">
                              {paymentStatus.status === 'UNPAID' && !paymentStatus.advancePayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdvancePaymentAmount('');
                                    setIsAdvancePaymentModalOpen(true);
                                  }}
                                  className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90"
                                >
                                  Inregistreaza avans
                                </button>
                              )}
                              {paymentStatus.status === 'UNPAID' && paymentStatus.advancePayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdvancePaymentAmount(String(paymentStatus.advancePayment.amount || ''));
                                    setIsAdvancePaymentModalOpen(true);
                                  }}
                                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                >
                                  Actualizeaza avans
                                </button>
                              )}
                              {paymentStatus.status === 'PARTIAL' && (
                                <button
                                  type="button"
                                  onClick={() => setIsFinalPaymentModalOpen(true)}
                                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                                >
                                  Inregistreaza plata finala
                                </button>
                              )}
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

                  {/* TEMPORARILY HIDDEN - DO NOT DELETE - Invoice Section */}
                  {/* {selectedAppointment.status === 'COMPLETED' && serviceOrder && (
                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Factură</h3>
                          <p className="text-xs text-gray-500">Generează factură pentru această programare finalizată.</p>
                        </div>
                        <button
                          type="button"
                          disabled={createInvoiceMutation.isPending}
                          onClick={() => {
                            const dueDate = new Date();
                            dueDate.setDate(dueDate.getDate() + 30); // Default 30 days payment term

                            const invoiceData = {
                              appointmentId: selectedAppointmentId,
                              serviceOrderId: serviceOrder.id,
                              clientId: selectedAppointment.clientId,
                              dueDate: dueDate.toISOString(),
                              tax: serviceOrder.tax || 0,
                              lineItems: serviceOrder.lineItems?.map((item, index) => ({
                                name: item.name,
                                description: item.description,
                                quantity: Number(item.quantity) || 1,
                                unitPrice: Number(item.unitPrice) || 0,
                                order: index,
                              })) || [],
                            };

                            createInvoiceMutation.mutate(invoiceData, {
                              onSuccess: (data) => {
                                showToast({
                                  title: 'Factură creată',
                                  description: `Factura ${data.invoiceNumber} a fost creată cu succes.`,
                                  type: 'success',
                                });
                                // Redirect to invoices page
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
                    </div>
                  )} */}

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
                    <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                    Nu exista mesaje deocamdata. Scrie primul mesaj mai jos.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex gap-3">
                        <div className="mt-1 rounded-full bg-viperx-primary/10 p-2 text-viperx-primary">
                          <MessageSquare size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {message.author?.firstName} {message.author?.lastName}
                            </p>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(message.createdAt, 'dd.MM.yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{message.body}</p>
                        </div>
                      </div>
                    ))}
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
                <div className="flex items-end gap-3">
                  <textarea
                    value={messageDraft}
                    onChange={(event) => handleMessageInputChange(event.target.value)}
                    placeholder="Scrie un mesaj..."
                    rows={2}
                    disabled={isSendingMessage}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={isSendingMessage || !messageDraft.trim()}
                    className="flex items-center gap-2 rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingMessage ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Se trimite...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Trimite</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Advance Payment Modal */}
      {isAdvancePaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Inregistreaza avans</h3>
              <p className="mt-1 text-sm text-gray-500">Introdu suma avansului pentru aceasta programare</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              {paymentStatus && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Total programare:</span>
                    <span className="font-semibold text-gray-900">{currencyFormatter.format(Number(paymentStatus.total || 0))}</span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Suma avans <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="advanceAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={advancePaymentAmount}
                    onChange={(e) => setAdvancePaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-viperx-primary focus:outline-none focus:ring-1 focus:ring-viperx-primary"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">RON</span>
                </div>
                {advancePaymentAmount && paymentStatus && (
                  <p className="mt-1 text-xs text-gray-500">
                    Rest dupa avans: {currencyFormatter.format(Math.max(0, Number(paymentStatus.total || 0) - parseFloat(advancePaymentAmount || 0)))}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsAdvancePaymentModalOpen(false);
                  setAdvancePaymentAmount('');
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Anuleaza
              </button>
              <button
                type="button"
                onClick={handleRecordAdvancePayment}
                disabled={!advancePaymentAmount || parseFloat(advancePaymentAmount) <= 0}
                className="rounded-lg bg-viperx-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-viperx-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirma avans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Payment Modal */}
      {isFinalPaymentModalOpen && paymentStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Inregistreaza plata finala</h3>
              <p className="mt-1 text-sm text-gray-500">Confirma plata restului pentru finalizarea tranzactiei</p>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total programare:</span>
                  <span className="font-semibold text-gray-900">{currencyFormatter.format(Number(paymentStatus.total || 0))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Avans platit:</span>
                  <span className="font-medium text-green-700">{currencyFormatter.format(Number(paymentStatus.advancePayment?.amount || 0))}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-medium text-gray-700">Rest de plata:</span>
                  <span className="font-bold text-orange-600">{currencyFormatter.format(Number(paymentStatus.remaining || 0))}</span>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  Vei confirma primirea sumei de <strong>{currencyFormatter.format(Number(paymentStatus.remaining || 0))}</strong> pentru finalizarea platii acestei programari.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                type="button"
                onClick={() => setIsFinalPaymentModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Anuleaza
              </button>
              <button
                type="button"
                onClick={handleRecordFinalPayment}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
              >
                Confirma plata finala
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
