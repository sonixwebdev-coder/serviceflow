import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO, isToday, isPast, differenceInDays } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { Calendar, ClipboardList, Users, Clock, TrendingUp, CheckCircle2, ListTodo, AlertCircle } from 'lucide-react';
import useAuth from '../context/useAuth';
import useTasks from '../hooks/useTasks';
import { useAppointments } from '../hooks/useAppointments.js';
import useLeaveRequests from '../hooks/useLeaveRequests';
import { usePersonalTodos } from '../hooks/usePersonalTodos';
import { TASK_STATUS, LEAVE_STATUS, USER_ROLES } from '../utils/constants';
import { formatHoursToRomanian } from '../utils/timeFormat';

const STATUS_LABELS = {
  [TASK_STATUS.TODO]: 'De facut',
  [TASK_STATUS.IN_PROGRESS]: 'In lucru',
  [TASK_STATUS.COMPLETED]: 'Finalizat',
};

const LEAVE_STATUS_LABELS = {
  [LEAVE_STATUS.PENDING]: 'In asteptare',
  [LEAVE_STATUS.APPROVED]: 'Aprobat',
  [LEAVE_STATUS.REJECTED]: 'Respins',
};

const APPOINTMENT_STATUS_LABELS = {
  scheduled: 'Programat',
  confirmed: 'Confirmat',
  in_progress: 'In lucru',
  completed: 'Finalizat',
  cancelled: 'Anulat',
  no_show: 'Absent',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
  } = useTasks();
  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    error: appointmentsError,
  } = useAppointments();
  const { leaveRequests } = useLeaveRequests();
  const { data: personalTodos = [], isLoading: todosLoading } = usePersonalTodos({ isCompleted: false });

  // Check user roles
  const isAdmin = hasRole(USER_ROLES.ADMIN);
  const isTechnician = hasRole(USER_ROLES.TECHNICIAN);
  const isSales = hasRole(USER_ROLES.SALES);
  const canViewLeaveRequests = isAdmin; // Only admins can view leave requests

  const stats = useMemo(() => {
    const now = new Date();

    const activeTasks = tasks.filter((task) =>
      task.status !== TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.CANCELLED
    ).length;

    const upcomingAppointmentsCount = appointments.filter((appointment) => {
      if (!appointment.scheduledStart) return false;
      const start = new Date(appointment.scheduledStart);
      return start >= now;
    }).length;

    const pendingLeaves = leaveRequests.filter((request) => request.status === LEAVE_STATUS.PENDING).length;

    // Count urgent/overdue personal todos
    const urgentTodos = personalTodos.filter((todo) => {
      // Support both uppercase and lowercase priority formats
      const priority = todo.priority?.toUpperCase();
      if (priority === 'URGENT') return true;
      if (todo.dueDate) {
        const dueDate = parseISO(todo.dueDate);
        return isPast(dueDate) && !isToday(dueDate);
      }
      return false;
    }).length;

    const statsArray = [
      {
        name: 'Task-uri active',
        value: activeTasks,
        icon: ClipboardList,
        color: 'bg-blue-500',
        bgLight: 'bg-blue-50',
        textColor: 'text-blue-600',
        link: '/tasks',
      },
      {
        name: 'Programari viitoare',
        value: upcomingAppointmentsCount,
        icon: Calendar,
        color: 'bg-green-500',
        bgLight: 'bg-green-50',
        textColor: 'text-green-600',
        link: '/crm/appointments',
      },
      {
        name: 'Reminder-e urgente',
        value: urgentTodos,
        icon: ListTodo,
        color: 'bg-red-500',
        bgLight: 'bg-red-50',
        textColor: 'text-red-600',
        link: '/personal-todos',
      },
    ];

    // Only admins can see pending leave requests stat
    if (canViewLeaveRequests) {
      statsArray.push({
        name: 'Concedii in asteptare',
        value: pendingLeaves,
        icon: Users,
        color: 'bg-yellow-500',
        bgLight: 'bg-yellow-50',
        textColor: 'text-yellow-600',
        link: '/leaves',
      });
    }

    // Removed "Ore saptamana" (pontaje) card as requested and replaced with Personal Todos

    return statsArray;
  }, [appointments, leaveRequests, tasks, canViewLeaveRequests, personalTodos]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((appointment) => appointment.scheduledStart && new Date(appointment.scheduledStart) >= now)
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
      .slice(0, 5);
  }, [appointments]);

  const recentTasks = useMemo(() => {
    return tasks
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.updatedAt || a.createdAt || 0);
        const bDate = new Date(b.updatedAt || b.createdAt || 0);
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [tasks]);

  const recentLeaveRequests = useMemo(() => {
    return leaveRequests
      .slice()
      .sort((a, b) => {
        const aDate = new Date(a.createdAt || 0);
        const bDate = new Date(b.createdAt || 0);
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [leaveRequests]);

  const priorityTodos = useMemo(() => {
    const now = new Date();
    return personalTodos
      .slice()
      .sort((a, b) => {
        // Priority order: URGENT > HIGH > MEDIUM > LOW
        // Support both uppercase and lowercase formats
        const priorityOrder = { URGENT: 0, urgent: 0, HIGH: 1, high: 1, MEDIUM: 2, medium: 2, LOW: 3, low: 3 };
        const aPriority = priorityOrder[a.priority] ?? 4;
        const bPriority = priorityOrder[b.priority] ?? 4;

        if (aPriority !== bPriority) return aPriority - bPriority;

        // Then sort by due date (soonest first)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;

        return 0;
      })
      .slice(0, 5);
  }, [personalTodos]);

  const renderSpinner = () => (
    <div className="flex items-center justify-center py-6">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-viperx-primary" />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Bine ai revenit, {user?.firstName}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Iata ce se intampla cu echipa ta astazi.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            onClick={() => navigate(stat.link)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar size={20} className="text-viperx-primary" />
              Programari viitoare
            </h2>
          </div>
          <div className="p-6">
            {appointmentsLoading ? (
              renderSpinner()
            ) : appointmentsError ? (
              <p className="text-sm text-red-600">{appointmentsError.message || appointmentsError}</p>
            ) : upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm">Nu exista programari viitoare.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {upcomingAppointments.map((appointmentItem) => (
                  <li key={appointmentItem.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-viperx-primary/10 flex items-center justify-center">
                      <Calendar size={20} className="text-viperx-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{appointmentItem.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {appointmentItem.scheduledStart ? format(new Date(appointmentItem.scheduledStart), 'dd MMM, HH:mm', { locale: roDateLocale }) : '—'}
                        {appointmentItem.scheduledEnd && ` - ${format(new Date(appointmentItem.scheduledEnd), 'HH:mm', { locale: roDateLocale })}`}
                      </p>
                      {appointmentItem.client && (
                        <p className="text-xs text-gray-500 mt-1">
                          {appointmentItem.client.firstName} {appointmentItem.client.lastName}
                        </p>
                      )}
                      <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {APPOINTMENT_STATUS_LABELS[appointmentItem.status] || appointmentItem.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList size={20} className="text-viperx-primary" />
              Task-uri recente
            </h2>
          </div>
          <div className="p-6">
            {tasksLoading ? (
              renderSpinner()
            ) : tasksError ? (
              <p className="text-sm text-red-600">{tasksError}</p>
            ) : recentTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm">Nu exista task-uri recente.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {recentTasks.map((task) => {
                  const statusLabel = STATUS_LABELS[task.status] || task.status;
                  const isCompleted = task.status === TASK_STATUS.COMPLETED;

                  return (
                    <li key={task._id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${isCompleted ? 'bg-green-100' : 'bg-blue-100'} flex items-center justify-center`}>
                        {isCompleted ? (
                          <CheckCircle2 size={20} className="text-green-600" />
                        ) : (
                          <ClipboardList size={20} className="text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{task.title}</p>
                        <p className="text-sm text-gray-600 capitalize mt-0.5">
                          {task.taskType} · {task.priority}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            isCompleted
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : task.status === TASK_STATUS.IN_PROGRESS
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {statusLabel}
                          </span>
                          <span className="text-xs text-gray-500">
                            {task.updatedAt || task.createdAt
                              ? formatDistanceToNow(new Date(task.updatedAt || task.createdAt), { addSuffix: true, locale: roDateLocale })
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Personal Todos/Reminders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:col-span-2">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ListTodo size={20} className="text-viperx-primary" />
              Reminder-ele mele
            </h2>
          </div>
          <div className="p-6">
            {todosLoading ? (
              renderSpinner()
            ) : priorityTodos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ListTodo size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm">Nu ai reminder-e active.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {priorityTodos.map((todo) => {
                  // Support both uppercase and lowercase priority formats
                  const priority = todo.priority?.toUpperCase();
                  const isUrgent = priority === 'URGENT';
                  const isHigh = priority === 'HIGH';
                  const isOverdue = todo.dueDate && isPast(parseISO(todo.dueDate)) && !isToday(parseISO(todo.dueDate));
                  const isDueToday = todo.dueDate && isToday(parseISO(todo.dueDate));
                  const dueDays = todo.dueDate ? differenceInDays(parseISO(todo.dueDate), new Date()) : null;

                  return (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition hover:shadow-md ${
                        isOverdue
                          ? 'border-red-300 bg-red-50'
                          : isUrgent
                          ? 'border-red-200 bg-red-50/50'
                          : isHigh
                          ? 'border-orange-200 bg-orange-50/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                        isOverdue
                          ? 'bg-red-100'
                          : isUrgent
                          ? 'bg-red-100'
                          : isHigh
                          ? 'bg-orange-100'
                          : 'bg-blue-100'
                      }`}>
                        {isOverdue ? (
                          <AlertCircle size={20} className="text-red-600" />
                        ) : (
                          <ListTodo size={20} className={
                            isUrgent ? 'text-red-600' : isHigh ? 'text-orange-600' : 'text-blue-600'
                          } />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{todo.title}</p>
                        {todo.description && (
                          <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">{todo.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            isUrgent
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : isHigh
                              ? 'bg-orange-100 text-orange-700 border-orange-300'
                              : todo.priority === 'MEDIUM'
                              ? 'bg-blue-100 text-blue-700 border-blue-300'
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}>
                            {todo.priority === 'URGENT' ? 'Urgent' : todo.priority === 'HIGH' ? 'Prioritate ridicata' : todo.priority === 'MEDIUM' ? 'Prioritate medie' : 'Prioritate scazuta'}
                          </span>
                          {todo.dueDate && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                              isOverdue
                                ? 'bg-red-100 text-red-700 border-red-300'
                                : isDueToday
                                ? 'bg-orange-100 text-orange-700 border-orange-300'
                                : dueDays <= 3
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}>
                              {isOverdue
                                ? 'Intarziat'
                                : isDueToday
                                ? 'Astazi'
                                : dueDays === 1
                                ? 'Maine'
                                : dueDays <= 3
                                ? `In ${dueDays} zile`
                                : format(parseISO(todo.dueDate), 'dd MMM', { locale: roDateLocale })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Leave Requests - Only visible to admins */}
        {canViewLeaveRequests && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden lg:col-span-2">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-viperx-primary" />
                Cereri de concediu recente
              </h2>
            </div>
            <div className="p-6">
              {recentLeaveRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm">Nu exista cereri de concediu recente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentLeaveRequests.map((request) => {
                    const statusLabel = LEAVE_STATUS_LABELS[request.status] || request.status;
                    const isPending = request.status === LEAVE_STATUS.PENDING;
                    const isApproved = request.status === LEAVE_STATUS.APPROVED;
                    const isRejected = request.status === LEAVE_STATUS.REJECTED;

                    return (
                      <div key={request._id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${
                          isPending ? 'bg-yellow-100' : isApproved ? 'bg-green-100' : 'bg-red-100'
                        } flex items-center justify-center`}>
                          <Users size={20} className={
                            isPending ? 'text-yellow-600' : isApproved ? 'text-green-600' : 'text-red-600'
                          } />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">
                            {request.employee?.firstName} {request.employee?.lastName}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {request.startDate && format(new Date(request.startDate), 'dd MMM', { locale: roDateLocale })}
                            {' - '}
                            {request.endDate && format(new Date(request.endDate), 'dd MMM', { locale: roDateLocale })}
                            {' '}({request.totalDays} {request.totalDays === 1 ? 'zi' : 'zile'})
                          </p>
                          <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border ${
                            isPending
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : isApproved
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
