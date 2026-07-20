import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, Users, MessageSquare, ListTodo } from 'lucide-react';

const QUICK_ACTIONS = [
  {
    icon: ClipboardList,
    label: 'Task-uri',
    link: '/tasks',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Calendar,
    label: 'Programari',
    link: '/crm/appointments',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: Users,
    label: 'Clienti',
    link: '/crm/clients',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: MessageSquare,
    label: 'Chat',
    link: '/chat',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: ListTodo,
    label: 'Reminder-e',
    link: '/personal-todos',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
  },
];

export default function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-3 gap-2">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.link)}
          className={`${action.bg} p-3 rounded-lg flex flex-col items-center gap-1.5 hover:opacity-80 transition`}
        >
          <action.icon className={`h-5 w-5 ${action.color}`} />
          <span className="text-xs font-medium text-gray-700">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
