import {
  Calendar,
  Check,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  LogIn,
  LogOut,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';

export const ENTITY_FILTER_OPTIONS = [
  { value: 'Client', label: 'Clienti' },
  { value: 'Appointment', label: 'Programari' },
  { value: 'Invoice', label: 'Facturi' },
  { value: 'Task', label: 'Task-uri' },
  { value: 'Asset', label: 'Active' },
  { value: 'Payment', label: 'Plati' },
];

export const ACTION_FILTER_OPTIONS = [
  { value: 'CREATE', label: 'Creare' },
  { value: 'UPDATE', label: 'Actualizare' },
  { value: 'DELETE', label: 'Stergere' },
  { value: 'APPROVE', label: 'Aprobare' },
  { value: 'REJECT', label: 'Respingere' },
];

const ENTITY_PRESENTATION = {
  Client: { icon: Users, label: 'Client' },
  Appointment: { icon: Calendar, label: 'Programare' },
  Invoice: { icon: FileText, label: 'Factura' },
  Task: { icon: ClipboardList, label: 'Task' },
  Asset: { icon: Package, label: 'Activ' },
  Payment: { icon: CreditCard, label: 'Plata' },
  TimeOffRequest: { icon: Clock, label: 'Concediu' },
  ChatChannel: { icon: MessageSquare, label: 'Canal chat' },
  ChatMessage: { icon: MessageSquare, label: 'Mesaj' },
  User: { icon: User, label: 'Utilizator' },
};

const ACTION_PRESENTATION = {
  CREATE: { icon: Plus, label: 'Creare', color: 'bg-green-100 text-green-700' },
  UPDATE: { icon: Pencil, label: 'Actualizare', color: 'bg-blue-100 text-blue-700' },
  DELETE: { icon: Trash2, label: 'Stergere', color: 'bg-red-100 text-red-700' },
  APPROVE: { icon: Check, label: 'Aprobare', color: 'bg-emerald-100 text-emerald-700' },
  REJECT: { icon: X, label: 'Respingere', color: 'bg-orange-100 text-orange-700' },
  LOGIN: { icon: LogIn, label: 'Conectare', color: 'bg-purple-100 text-purple-700' },
  LOGOUT: { icon: LogOut, label: 'Deconectare', color: 'bg-gray-100 text-gray-700' },
};

const DEFAULT_ENTITY = { icon: ClipboardList };
const DEFAULT_ACTION = { icon: Pencil, color: 'bg-gray-100 text-gray-700' };

export function getActivityPresentation(activity) {
  const entity = ENTITY_PRESENTATION[activity.entityType] || DEFAULT_ENTITY;
  const action = ACTION_PRESENTATION[activity.action] || DEFAULT_ACTION;
  const actorName = activity.actor
    ? `${activity.actor.firstName} ${activity.actor.lastName}`
    : 'Sistem';
  const actorInitials = activity.actor
    ? `${activity.actor.firstName?.[0] || ''}${activity.actor.lastName?.[0] || ''}`
    : 'S';

  return {
    EntityIcon: entity.icon,
    ActionIcon: action.icon,
    actionColor: action.color,
    actionLabel: action.label || activity.action,
    entityLabel: entity.label || activity.entityType,
    actorName,
    actorInitials,
  };
}
