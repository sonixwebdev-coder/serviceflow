import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Dashboard Store - Persisted configuration for customizable dashboard
 * Stores widget order, visibility, and size preferences
 */

// Available widget types
export const WIDGET_TYPES = {
  TODAY_SCHEDULE: 'today_schedule',
  ACTIVE_TASKS: 'active_tasks',
  REMINDERS: 'reminders',
  QUICK_STATS: 'quick_stats',
  RECENT_MESSAGES: 'recent_messages',
  PENDING_LEAVES: 'pending_leaves',
  UPCOMING_APPOINTMENTS: 'upcoming_appointments',
  QUICK_ACTIONS: 'quick_actions',
};

// Widget metadata
export const WIDGET_CONFIG = {
  [WIDGET_TYPES.TODAY_SCHEDULE]: {
    id: WIDGET_TYPES.TODAY_SCHEDULE,
    title: 'Programul zilei',
    description: 'Programarile de astazi in format timeline',
    icon: 'Calendar',
    defaultSize: 'large',
    defaultVisible: true,
    roles: ['all'],
  },
  [WIDGET_TYPES.ACTIVE_TASKS]: {
    id: WIDGET_TYPES.ACTIVE_TASKS,
    title: 'Task-uri active',
    description: 'Task-urile tale in lucru',
    icon: 'ClipboardList',
    defaultSize: 'medium',
    defaultVisible: true,
    roles: ['all'],
  },
  [WIDGET_TYPES.REMINDERS]: {
    id: WIDGET_TYPES.REMINDERS,
    title: 'Reminder-e',
    description: 'Lista reminder-elor personale',
    icon: 'ListTodo',
    defaultSize: 'medium',
    defaultVisible: true,
    roles: ['all'],
  },
  [WIDGET_TYPES.QUICK_STATS]: {
    id: WIDGET_TYPES.QUICK_STATS,
    title: 'Statistici rapide',
    description: 'Numar task-uri, programari, mesaje',
    icon: 'BarChart3',
    defaultSize: 'full',
    defaultVisible: true,
    roles: ['all'],
  },
  [WIDGET_TYPES.RECENT_MESSAGES]: {
    id: WIDGET_TYPES.RECENT_MESSAGES,
    title: 'Mesaje recente',
    description: 'Ultimele conversatii din chat',
    icon: 'MessageSquare',
    defaultSize: 'medium',
    defaultVisible: false,
    roles: ['all'],
  },
  [WIDGET_TYPES.PENDING_LEAVES]: {
    id: WIDGET_TYPES.PENDING_LEAVES,
    title: 'Cereri concediu',
    description: 'Cereri de concediu in asteptare',
    icon: 'Users',
    defaultSize: 'medium',
    defaultVisible: true,
    roles: ['ADMIN'],
  },
  [WIDGET_TYPES.UPCOMING_APPOINTMENTS]: {
    id: WIDGET_TYPES.UPCOMING_APPOINTMENTS,
    title: 'Programari viitoare',
    description: 'Programarile din urmatoarele zile',
    icon: 'CalendarDays',
    defaultSize: 'medium',
    defaultVisible: false,
    roles: ['all'],
  },
  [WIDGET_TYPES.QUICK_ACTIONS]: {
    id: WIDGET_TYPES.QUICK_ACTIONS,
    title: 'Actiuni rapide',
    description: 'Scurtaturi catre pagini frecvente',
    icon: 'Zap',
    defaultSize: 'small',
    defaultVisible: true,
    roles: ['all'],
  },
};

// Default widget order
const getDefaultWidgets = (userRole) => {
  const widgets = [];

  Object.values(WIDGET_CONFIG).forEach((widget) => {
    const isRoleAllowed = widget.roles.includes('all') || widget.roles.includes(userRole);
    if (isRoleAllowed) {
      widgets.push({
        id: widget.id,
        visible: widget.defaultVisible,
        size: widget.defaultSize,
      });
    }
  });

  return widgets;
};

export const useDashboardStore = create(
  persist(
    (set, get) => ({
      // Widget configuration per user
      widgets: [],

      // Edit mode
      isEditMode: false,

      // Initialize with defaults if empty
      initializeWidgets: (userRole) => {
        const currentWidgets = get().widgets;
        if (currentWidgets.length === 0) {
          set({ widgets: getDefaultWidgets(userRole) });
        }
      },

      // Toggle edit mode
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
      setEditMode: (isEditMode) => set({ isEditMode }),

      // Update widget order (after drag and drop)
      reorderWidgets: (newOrder) => set({ widgets: newOrder }),

      // Toggle widget visibility
      toggleWidgetVisibility: (widgetId) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === widgetId ? { ...w, visible: !w.visible } : w
          ),
        })),

      // Set widget visibility
      setWidgetVisibility: (widgetId, visible) =>
        set((state) => ({
          widgets: state.widgets.map((w) => (w.id === widgetId ? { ...w, visible } : w)),
        })),

      // Change widget size
      setWidgetSize: (widgetId, size) =>
        set((state) => ({
          widgets: state.widgets.map((w) => (w.id === widgetId ? { ...w, size } : w)),
        })),

      // Reset to defaults
      resetToDefaults: (userRole) => set({ widgets: getDefaultWidgets(userRole) }),

      // Get visible widgets
      getVisibleWidgets: () => get().widgets.filter((w) => w.visible),

      // Get widget by id
      getWidget: (widgetId) => get().widgets.find((w) => w.id === widgetId),
    }),
    {
      name: 'dashboard-config',
      partialize: (state) => ({ widgets: state.widgets }),
    }
  )
);
