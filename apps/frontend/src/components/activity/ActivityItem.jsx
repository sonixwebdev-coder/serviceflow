import { formatDistanceToNow, format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  User,
  Users,
  Calendar,
  FileText,
  ClipboardList,
  Package,
  CreditCard,
  Clock,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  LogIn,
  LogOut,
} from 'lucide-react';

// Entity type to icon mapping
const ENTITY_ICONS = {
  Client: Users,
  Appointment: Calendar,
  Invoice: FileText,
  Task: ClipboardList,
  Asset: Package,
  Payment: CreditCard,
  TimeOffRequest: Clock,
  ChatChannel: MessageSquare,
  ChatMessage: MessageSquare,
  User: User,
};

// Action to icon mapping
const ACTION_ICONS = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  APPROVE: Check,
  REJECT: X,
  LOGIN: LogIn,
  LOGOUT: LogOut,
};

// Action to color mapping
const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-600',
  UPDATE: 'bg-blue-100 text-blue-600',
  DELETE: 'bg-red-100 text-red-600',
  APPROVE: 'bg-emerald-100 text-emerald-600',
  REJECT: 'bg-orange-100 text-orange-600',
  LOGIN: 'bg-purple-100 text-purple-600',
  LOGOUT: 'bg-gray-100 text-gray-600',
};

// Entity type labels in Romanian
const ENTITY_LABELS = {
  Client: 'Client',
  Appointment: 'Programare',
  Invoice: 'Factura',
  Task: 'Task',
  Asset: 'Activ',
  Payment: 'Plata',
  TimeOffRequest: 'Concediu',
  ChatChannel: 'Canal chat',
  ChatMessage: 'Mesaj',
  User: 'Utilizator',
};

export default function ActivityItem({ activity, showTime = true }) {
  const EntityIcon = ENTITY_ICONS[activity.entityType] || ClipboardList;
  const ActionIcon = ACTION_ICONS[activity.action] || Pencil;
  const actionColor = ACTION_COLORS[activity.action] || 'bg-gray-100 text-gray-600';
  const entityLabel = ENTITY_LABELS[activity.entityType] || activity.entityType;

  const actorName = activity.actor
    ? `${activity.actor.firstName} ${activity.actor.lastName}`
    : 'Sistem';

  const actorInitials = activity.actor
    ? `${activity.actor.firstName?.[0] || ''}${activity.actor.lastName?.[0] || ''}`
    : 'S';

  const timeAgo = formatDistanceToNow(new Date(activity.createdAt), {
    addSuffix: true,
    locale: roDateLocale,
  });

  const fullTime = format(new Date(activity.createdAt), 'dd MMM yyyy, HH:mm', {
    locale: roDateLocale,
  });

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition group">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {activity.actor?.avatarUrl ? (
          <img
            src={activity.actor.avatarUrl}
            alt={actorName}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
            {actorInitials}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{actorName}</span>{' '}
              <span className="text-gray-600">{activity.description}</span>
            </p>

            {/* Entity badge */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionColor}`}>
                <ActionIcon className="h-3 w-3" />
                {activity.action}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <EntityIcon className="h-3 w-3" />
                {entityLabel}
              </span>
            </div>
          </div>

          {/* Time */}
          {showTime && (
            <span
              className="flex-shrink-0 text-xs text-gray-400 group-hover:text-gray-600"
              title={fullTime}
            >
              {timeAgo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
