import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isToday, isPast, parseISO } from 'date-fns';
import { ClipboardList, Calendar, MessageSquare, AlertTriangle } from 'lucide-react';
import useTasks from '../../../hooks/useTasks';
import { useAppointments } from '../../../hooks/useAppointments';
import { usePersonalTodos } from '../../../hooks/usePersonalTodos';
import { useChatStore } from '../../../state/useChatStore';
import { TASK_STATUS } from '../../../utils/constants';

export default function QuickStatsWidget() {
  const navigate = useNavigate();
  const { tasks, loading: tasksLoading } = useTasks();
  const { data: appointments = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: todos = [], isLoading: todosLoading } = usePersonalTodos({ isCompleted: false });
  const { unreadCounts } = useChatStore();

  const stats = useMemo(() => {
    const activeTasks = tasks.filter(
      (t) => t.status !== TASK_STATUS.COMPLETED && t.status !== TASK_STATUS.CANCELLED
    ).length;

    const todayAppointments = appointments.filter(
      (a) => a.scheduledStart && isToday(new Date(a.scheduledStart))
    ).length;

    const unreadMessages = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

    const urgentItems = todos.filter((todo) => {
      const priority = todo.priority?.toUpperCase();
      const isOverdue =
        todo.dueDate && isPast(parseISO(todo.dueDate)) && !isToday(parseISO(todo.dueDate));
      return priority === 'URGENT' || isOverdue;
    }).length;

    return [
      {
        label: 'Task-uri active',
        value: activeTasks,
        icon: ClipboardList,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        link: '/tasks',
      },
      {
        label: 'Programari azi',
        value: todayAppointments,
        icon: Calendar,
        color: 'text-green-600',
        bg: 'bg-green-50',
        link: '/crm/appointments',
      },
      {
        label: 'Mesaje necitite',
        value: unreadMessages,
        icon: MessageSquare,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        link: '/chat',
      },
      {
        label: 'Urgente',
        value: urgentItems,
        icon: AlertTriangle,
        color: urgentItems > 0 ? 'text-red-600' : 'text-gray-400',
        bg: urgentItems > 0 ? 'bg-red-50' : 'bg-gray-50',
        link: '/personal-todos',
      },
    ];
  }, [tasks, appointments, todos, unreadCounts]);

  const isLoading = tasksLoading || appointmentsLoading || todosLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-lg bg-gray-50">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 mb-2" />
            <div className="h-6 w-10 animate-pulse rounded-sm bg-gray-200 mb-1" />
            <div className="h-3 w-16 animate-pulse rounded-sm bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <button
          key={stat.label}
          onClick={() => navigate(stat.link)}
          className={`${stat.bg} p-4 rounded-lg text-left hover:opacity-80 transition group`}
        >
          <stat.icon className={`h-6 w-6 ${stat.color} mb-2`} />
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          <p className="text-xs text-gray-600">{stat.label}</p>
        </button>
      ))}
    </div>
  );
}
