import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  addMonths,
  subMonths,
} from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Check,
  XCircle,
  Clock,
  UserPlus,
} from 'lucide-react';
import useLeaveRequests from '../hooks/useLeaveRequests';
import useUsers from '../hooks/useUsers';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import ExportButton from '../components/ExportButton';
import DatePicker from '../components/ui/DatePicker';
import { USER_ROLES, LEAVE_TYPE, LEAVE_STATUS } from '../utils/constants';
import {
  submitLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  createMedicalLeave,
} from '../services/leaveRequestService';

const LEAVE_TYPE_LABELS = {
  [LEAVE_TYPE.VACATION]: 'Concediu de odihna',
  [LEAVE_TYPE.SICK]: 'Concediu medical',
  [LEAVE_TYPE.PERSONAL]: 'Concediu personal',
  [LEAVE_TYPE.UNPAID]: 'Concediu fara plata',
  [LEAVE_TYPE.MEDICAL]: 'Concediu medical (admin)',
};

const STATUS_META = {
  [LEAVE_STATUS.PENDING]: {
    label: 'In asteptare',
    icon: Clock,
    class: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  [LEAVE_STATUS.APPROVED]: {
    label: 'Aprobat',
    icon: Check,
    class: 'bg-green-50 text-green-800 border-green-200',
  },
  [LEAVE_STATUS.REJECTED]: {
    label: 'Respins',
    icon: XCircle,
    class: 'bg-red-50 text-red-800 border-red-200',
  },
};

const defaultForm = {
  leaveType: LEAVE_TYPE.VACATION,
  startDate: null,
  endDate: null,
  reason: '',
};

const LeaveRequests = () => {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();
  const isManagerial = hasRole(USER_ROLES.ADMIN);

  const { leaveRequests, loading, error, refresh } = useLeaveRequests();
  const { users } = useUsers();
  const [requests, setRequests] = useState([]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({ start: null, end: null });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState(defaultForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [isMedicalLeaveModalOpen, setIsMedicalLeaveModalOpen] = useState(false);
  const [medicalLeaveForm, setMedicalLeaveForm] = useState({
    employeeId: '',
    startDate: null,
    endDate: null,
    reason: '',
  });
  const [medicalLeaveError, setMedicalLeaveError] = useState('');
  const [submittingMedical, setSubmittingMedical] = useState(false);

  const [actionInProgress, setActionInProgress] = useState(null);
  const [reviewNotesMap, setReviewNotesMap] = useState({});

  useEffect(() => {
    setRequests(leaveRequests);
  }, [leaveRequests]);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  // Get days to display in calendar (including padding)
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfWeek = monthStart.getDay();
    const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Adjust for Monday start

    const previousMonth = subMonths(monthStart, 1);
    const previousMonthEnd = endOfMonth(previousMonth);
    const previousMonthDays = eachDayOfInterval({
      start: new Date(
        previousMonthEnd.getFullYear(),
        previousMonthEnd.getMonth(),
        previousMonthEnd.getDate() - paddingDays + 1
      ),
      end: previousMonthEnd,
    });

    return [...previousMonthDays, ...days];
  }, [monthStart, monthEnd]);

  // Calculate approved requests per day
  const approvedRequestsByDay = useMemo(() => {
    const map = new Map();
    requests
      .filter((req) => req.status === LEAVE_STATUS.APPROVED)
      .forEach((req) => {
        const start = startOfDay(new Date(req.startDate));
        const end = startOfDay(new Date(req.endDate));

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = format(d, 'yyyy-MM-dd');
          const existing = map.get(key) || [];
          map.set(key, [...existing, req]);
        }
      });
    return map;
  }, [requests]);

  // Get requests for a specific day
  const getRequestsForDay = useCallback(
    (day) => {
      const key = format(day, 'yyyy-MM-dd');
      return approvedRequestsByDay.get(key) || [];
    },
    [approvedRequestsByDay]
  );

  const handleDateClick = (day) => {
    const today = startOfDay(new Date());
    if (isBefore(day, today)) {
      return; // Can't select past dates
    }

    if (!selectedDates.start || (selectedDates.start && selectedDates.end)) {
      // Starting a new selection
      setSelectedDates({ start: day, end: null });
    } else if (isSameDay(day, selectedDates.start)) {
      // Clicked same day twice - single day leave
      setSelectedDates({ start: day, end: day });
      // Open modal with same start and end date
      setTimeout(() => {
        setFormData({
          ...defaultForm,
          startDate: day,
          endDate: day,
        });
        setIsModalOpen(true);
      }, 100);
    } else if (isBefore(day, selectedDates.start)) {
      // Clicked before start date, swap them and open modal
      setSelectedDates({ start: day, end: selectedDates.start });
      // Open modal with selected dates
      setTimeout(() => {
        setFormData({
          ...defaultForm,
          startDate: day,
          endDate: selectedDates.start,
        });
        setIsModalOpen(true);
      }, 100);
    } else {
      // Clicked after start date, set as end and open modal
      setSelectedDates({ ...selectedDates, end: day });
      // Open modal with selected dates
      setTimeout(() => {
        setFormData({
          ...defaultForm,
          startDate: selectedDates.start,
          endDate: day,
        });
        setIsModalOpen(true);
      }, 100);
    }
  };

  const isDateSelected = (day) => {
    if (!selectedDates.start) return false;
    if (!selectedDates.end) return isSameDay(day, selectedDates.start);
    return day >= selectedDates.start && day <= selectedDates.end;
  };

  const openRequestModal = () => {
    if (!selectedDates.start) {
      showToast({
        title: 'Selecteaza datele',
        description: 'Selecteaza data de inceput si sfarsit din calendar.',
        type: 'warning',
      });
      return;
    }

    if (!selectedDates.end) {
      showToast({
        title: 'Selecteaza perioada',
        description:
          'Selecteaza data de sfarsit sau apasa din nou pe aceeasi zi pentru o singura zi.',
        type: 'warning',
      });
      return;
    }

    setFormData({
      ...defaultForm,
      startDate: selectedDates.start,
      endDate: selectedDates.end || selectedDates.start,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(defaultForm);
    setFormError('');
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!formData.startDate || !formData.endDate) {
      setFormError('Data de inceput si sfarsit sunt necesare');
      return;
    }

    setSubmitting(true);
    try {
      await submitLeaveRequest({
        ...formData,
        startDate: format(formData.startDate, 'yyyy-MM-dd'),
        endDate: format(formData.endDate, 'yyyy-MM-dd'),
      });
      await refresh();
      closeModal();
      setSelectedDates({ start: null, end: null });
      showToast({
        title: 'Cerere trimisa',
        description: 'Cererea ta de concediu a fost trimisa spre aprobare.',
        type: 'success',
      });
    } catch (submissionError) {
      setFormError(submissionError.message || 'Nu s-a putut trimite cererea');
      showToast({
        title: 'Cererea a esuat',
        description: submissionError.message || 'Nu s-a putut trimite cererea.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openMedicalLeaveModal = () => {
    // Pre-fill dates if available from calendar selection
    setMedicalLeaveForm({
      employeeId: '',
      startDate: selectedDates.start || null,
      endDate: selectedDates.end || null,
      reason: '',
    });
    setMedicalLeaveError('');
    setIsMedicalLeaveModalOpen(true);
  };

  const closeMedicalLeaveModal = () => {
    setIsMedicalLeaveModalOpen(false);
    setMedicalLeaveForm({
      employeeId: '',
      startDate: null,
      endDate: null,
      reason: '',
    });
    setMedicalLeaveError('');
  };

  const handleMedicalLeaveInputChange = (event) => {
    const { name, value } = event.target;
    setMedicalLeaveForm((current) => ({ ...current, [name]: value }));
  };

  const handleMedicalLeaveSubmit = async (event) => {
    event.preventDefault();
    setMedicalLeaveError('');

    if (!medicalLeaveForm.employeeId) {
      setMedicalLeaveError('Selecteaza un angajat');
      return;
    }

    if (!medicalLeaveForm.startDate || !medicalLeaveForm.endDate) {
      setMedicalLeaveError('Data de inceput si sfarsit sunt necesare');
      return;
    }

    if (!medicalLeaveForm.reason.trim()) {
      setMedicalLeaveError('Motivul este necesar');
      return;
    }

    setSubmittingMedical(true);
    try {
      await createMedicalLeave({
        employeeId: medicalLeaveForm.employeeId,
        startDate: format(medicalLeaveForm.startDate, 'yyyy-MM-dd'),
        endDate: format(medicalLeaveForm.endDate, 'yyyy-MM-dd'),
        reason: medicalLeaveForm.reason,
      });
      await refresh();
      closeMedicalLeaveModal();
      setSelectedDates({ start: null, end: null });
      showToast({
        title: 'Concediu medical creat',
        description: 'Concediul medical a fost creat si aprobat automat.',
        type: 'success',
      });
    } catch (submissionError) {
      setMedicalLeaveError(submissionError.message || 'Nu s-a putut crea concediul medical');
      showToast({
        title: 'Eroare',
        description: submissionError.message || 'Nu s-a putut crea concediul medical.',
        type: 'error',
      });
    } finally {
      setSubmittingMedical(false);
    }
  };

  const handleApprove = async (requestId) => {
    const notes = reviewNotesMap[requestId] || '';
    const previous = requests;

    setActionInProgress(requestId);
    setRequests((current) =>
      current.map((request) =>
        request._id === requestId
          ? {
              ...request,
              status: LEAVE_STATUS.APPROVED,
              reviewNotes: notes,
              reviewedBy:
                request.reviewedBy ||
                (user
                  ? { firstName: user.firstName, lastName: user.lastName }
                  : request.reviewedBy),
              reviewedAt: new Date().toISOString(),
            }
          : request
      )
    );

    try {
      await approveLeaveRequest(requestId, notes ? { reviewNotes: notes } : {});
      setReviewNotesMap((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      await refresh();
      showToast({
        title: 'Concediu aprobat',
        description: 'Cererea de concediu a fost aprobata.',
        type: 'success',
      });
    } catch (approvalError) {
      setRequests(previous);
      showToast({
        title: 'Aprobarea a esuat',
        description: approvalError.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (requestId) => {
    const notes = (reviewNotesMap[requestId] || '').trim();
    if (!notes) {
      showToast({
        title: 'Notite necesare',
        description: 'Te rugam sa adaugi notite inainte de a respinge.',
        type: 'warning',
      });
      return;
    }

    const previous = requests;
    setActionInProgress(requestId);
    setRequests((current) =>
      current.map((request) =>
        request._id === requestId
          ? {
              ...request,
              status: LEAVE_STATUS.REJECTED,
              reviewNotes: notes,
              reviewedBy:
                request.reviewedBy ||
                (user
                  ? { firstName: user.firstName, lastName: user.lastName }
                  : request.reviewedBy),
              reviewedAt: new Date().toISOString(),
            }
          : request
      )
    );

    try {
      await rejectLeaveRequest(requestId, { reviewNotes: notes });
      setReviewNotesMap((current) => {
        const next = { ...current };
        delete next[requestId];
        return next;
      });
      await refresh();
      showToast({
        title: 'Concediu respins',
        description: 'Cererea de concediu a fost respinsa.',
        type: 'warning',
      });
    } catch (rejectionError) {
      setRequests(previous);
      showToast({
        title: 'Respingerea a esuat',
        description: rejectionError.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const weekDays = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sam', 'Dum'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Cereri de concediu</h1>
          <p className="page-subtitle">
            Solicita zile libere si urmareste statusul cererilor tale.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <ExportButton
            entityType="leave-requests"
            filters={{
              startDate: format(monthStart, 'yyyy-MM-dd'),
              endDate: format(monthEnd, 'yyyy-MM-dd'),
            }}
          />
          <button
            type="button"
            onClick={openRequestModal}
            disabled={!selectedDates.start || !selectedDates.end}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CalendarIcon size={16} />
            Trimite cerere
          </button>
          {isManagerial && (
            <button
              type="button"
              onClick={openMedicalLeaveModal}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-all hover:shadow-md"
            >
              <UserPlus size={16} />
              Adauga concediu medical
            </button>
          )}
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Selecteaza perioada concediului
          </h2>
          <p className="text-sm text-gray-600">
            Apasa pe o zi pentru inceput, apoi pe alta zi pentru sfarsit. Pentru o singura zi, apasa
            de doua ori pe aceeasi zi.
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-medium text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: roDateLocale })}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date())}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Azi
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            const isPast = isBefore(day, startOfDay(new Date()));
            const requestsOnDay = getRequestsForDay(day);
            const isAtLimit = requestsOnDay.length >= 3; // Updated to max 3 employees per day
            const selected = isDateSelected(day);
            const today = isToday(day);
            const currentMonthDay = isSameMonth(day, currentMonth);

            return (
              <button
                key={index}
                type="button"
                onClick={() => !isPast && currentMonthDay && handleDateClick(day)}
                disabled={isPast || !currentMonthDay}
                className={`
                  relative min-h-[80px] p-2 rounded-lg border-2 transition-all
                  ${!currentMonthDay ? 'bg-gray-50 text-gray-300 cursor-default border-gray-100' : ''}
                  ${isPast && currentMonthDay ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''}
                  ${selected && !isPast && currentMonthDay ? 'bg-primary/15 border-primary shadow-md ring-2 ring-primary/20' : 'border-gray-200'}
                  ${today && !selected && currentMonthDay ? 'border-primary ring-2 ring-primary/30' : ''}
                  ${!isPast && !selected && currentMonthDay ? 'hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm' : ''}
                  ${isAtLimit && currentMonthDay ? 'ring-2 ring-red-300' : ''}
                `}
              >
                <div
                  className={`text-sm font-semibold mb-1 ${today && currentMonthDay ? 'text-primary' : ''}`}
                >
                  {format(day, 'd')}
                </div>
                {requestsOnDay.length > 0 && currentMonthDay && (
                  <div className="space-y-0.5">
                    {requestsOnDay.slice(0, 3).map((req, i) => {
                      // Rotate through colors for visual distinction
                      const colors = [
                        'bg-blue-500 text-white',
                        'bg-purple-500 text-white',
                        'bg-teal-500 text-white',
                        'bg-indigo-500 text-white',
                      ];
                      const colorClass = colors[i % colors.length];

                      return (
                        <div
                          key={i}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate shadow-sm ${colorClass}`}
                          title={`${req.employee?.firstName} ${req.employee?.lastName}`}
                        >
                          {req.employee?.firstName?.[0]}
                          {req.employee?.lastName?.[0]}
                        </div>
                      );
                    })}
                    {isAtLimit && (
                      <div className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-bold shadow-sm">
                        FULL
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Legenda</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
              </div>
              <span className="text-gray-700 font-medium">Ziua de azi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary" />
              <span className="text-gray-700 font-medium">Selectat</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-3 h-6 rounded bg-blue-500"></div>
                <div className="w-3 h-6 rounded bg-purple-500"></div>
              </div>
              <span className="text-gray-700 font-medium">Concedii aprobate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-red-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                FULL
              </div>
              <span className="text-gray-700 font-medium">Limita atinsa (3/zi)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gray-100 border border-gray-300" />
              <span className="text-gray-700 font-medium">Trecut</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition" />
              <span className="text-gray-700 font-medium">Disponibil</span>
            </div>
          </div>
        </div>
      </div>

      {/* Request History */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Istoric cereri</h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-sm text-red-600">{error}</div>
          ) : requests.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              Nicio cerere de concediu inca.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Angajat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perioada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motiv
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {isManagerial && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => {
                  const statusMeta = STATUS_META[request.status];
                  const StatusIcon = statusMeta?.icon;

                  return (
                    <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {request.employee?.firstName} {request.employee?.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{request.employee?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {format(new Date(request.startDate), 'dd MMM yyyy', {
                            locale: roDateLocale,
                          })}{' '}
                          -{' '}
                          {format(new Date(request.endDate), 'dd MMM yyyy', {
                            locale: roDateLocale,
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {request.totalDays} {request.totalDays === 1 ? 'zi' : 'zile'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {LEAVE_TYPE_LABELS[request.leaveType] || request.leaveType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-600 max-w-xs truncate"
                          title={request.reason}
                        >
                          {request.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusMeta?.class || ''}`}
                        >
                          {StatusIcon && <StatusIcon size={12} />}
                          {statusMeta?.label || request.status}
                        </span>
                        {request.reviewNotes && (
                          <div className="mt-1 text-xs text-gray-500">{request.reviewNotes}</div>
                        )}
                      </td>
                      {isManagerial && request.status === LEAVE_STATUS.PENDING && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={reviewNotesMap[request._id] || ''}
                              onChange={(event) =>
                                setReviewNotesMap((current) => ({
                                  ...current,
                                  [request._id]: event.target.value,
                                }))
                              }
                              placeholder="Notite (obligatorii pentru respingere)"
                              className="rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(request._id)}
                                disabled={actionInProgress === request._id}
                                className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
                              >
                                {actionInProgress === request._id ? 'Se proceseaza...' : 'Aproba'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(request._id)}
                                disabled={actionInProgress === request._id}
                                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
                              >
                                {actionInProgress === request._id ? 'Se proceseaza...' : 'Respinge'}
                              </button>
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-sm text-red-600">{error}</div>
          ) : requests.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              Nicio cerere de concediu inca.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {requests.map((request) => {
                const statusMeta = STATUS_META[request.status];
                const StatusIcon = statusMeta?.icon;

                return (
                  <div key={request._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {request.employee?.firstName} {request.employee?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{request.employee?.email}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusMeta?.class || ''}`}
                      >
                        {StatusIcon && <StatusIcon size={12} />}
                        {statusMeta?.label}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <CalendarIcon size={14} className="text-gray-400" />
                        {format(new Date(request.startDate), 'dd MMM yyyy', {
                          locale: roDateLocale,
                        })}{' '}
                        -{' '}
                        {format(new Date(request.endDate), 'dd MMM yyyy', { locale: roDateLocale })}
                        <span className="text-xs text-gray-500">
                          ({request.totalDays} {request.totalDays === 1 ? 'zi' : 'zile'})
                        </span>
                      </div>
                      <p className="text-gray-600">
                        <span className="font-medium">Tip:</span>{' '}
                        {LEAVE_TYPE_LABELS[request.leaveType] || request.leaveType}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Motiv:</span> {request.reason}
                      </p>
                      {request.reviewNotes && (
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">Notite:</span> {request.reviewNotes}
                        </p>
                      )}
                    </div>

                    {isManagerial && request.status === LEAVE_STATUS.PENDING && (
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <textarea
                          value={reviewNotesMap[request._id] || ''}
                          onChange={(event) =>
                            setReviewNotesMap((current) => ({
                              ...current,
                              [request._id]: event.target.value,
                            }))
                          }
                          placeholder="Notite (obligatorii pentru respingere)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(request._id)}
                            disabled={actionInProgress === request._id}
                            className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
                          >
                            {actionInProgress === request._id ? 'Se proceseaza...' : 'Aproba'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(request._id)}
                            disabled={actionInProgress === request._id}
                            className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
                          >
                            {actionInProgress === request._id ? 'Se proceseaza...' : 'Respinge'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ margin: 0 }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
            style={{ margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Cerere concediu</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-3 sm:py-4 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tip concediu *
                </label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data inceput *
                  </label>
                  <input
                    type="text"
                    value={
                      formData.startDate
                        ? format(formData.startDate, 'dd MMM yyyy', { locale: roDateLocale })
                        : ''
                    }
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data sfarsit *
                  </label>
                  <input
                    type="text"
                    value={
                      formData.endDate
                        ? format(formData.endDate, 'dd MMM yyyy', { locale: roDateLocale })
                        : ''
                    }
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motiv *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Explica motivul cererii tale..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Anuleaza
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Se trimite...' : 'Trimite cerere'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medical Leave Modal (Admin Only) */}
      {isMedicalLeaveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ margin: 0 }}
          onClick={closeMedicalLeaveModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
            style={{ margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Adauga concediu medical
              </h2>
              <button
                type="button"
                onClick={closeMedicalLeaveModal}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleMedicalLeaveSubmit}
              className="px-4 sm:px-6 py-3 sm:py-4 space-y-4"
            >
              {medicalLeaveError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {medicalLeaveError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Angajat *</label>
                <select
                  name="employeeId"
                  value={medicalLeaveForm.employeeId}
                  onChange={handleMedicalLeaveInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">Selecteaza angajat...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <DatePicker
                  label="Data inceput"
                  value={medicalLeaveForm.startDate}
                  onChange={(date) =>
                    setMedicalLeaveForm((current) => ({ ...current, startDate: date }))
                  }
                  placeholder="Selecteaza data inceput"
                  required
                />
                <DatePicker
                  label="Data sfarsit"
                  value={medicalLeaveForm.endDate}
                  onChange={(date) =>
                    setMedicalLeaveForm((current) => ({ ...current, endDate: date }))
                  }
                  minDate={medicalLeaveForm.startDate}
                  placeholder="Selecteaza data sfarsit"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motiv *</label>
                <textarea
                  name="reason"
                  value={medicalLeaveForm.reason}
                  onChange={handleMedicalLeaveInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Motivul concediului medical..."
                  required
                />
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
                <strong>Nota:</strong> Concediul medical va fi creat si aprobat automat. Angajatul
                nu va putea vedea acest concediu.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeMedicalLeaveModal}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Anuleaza
                </button>
                <button
                  type="submit"
                  disabled={submittingMedical}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingMedical ? 'Se creeaza...' : 'Creaza concediu medical'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
