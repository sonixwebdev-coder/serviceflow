import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Sun,
  Moon,
  Sunrise,
  Settings2,
  GripVertical,
  Eye,
  EyeOff,
  X,
  RotateCcw,
  Calendar,
  ClipboardList,
  ListTodo,
  BarChart3,
  MessageSquare,
  Users,
  CalendarDays,
  Zap,
} from 'lucide-react';
import useAuth from '../context/useAuth';
import { useDashboardStore, WIDGET_TYPES, WIDGET_CONFIG } from '../state/useDashboardStore';
import {
  TodayScheduleWidget,
  ActiveTasksWidget,
  RemindersWidget,
  QuickStatsWidget,
  RecentMessagesWidget,
  PendingLeavesWidget,
  UpcomingAppointmentsWidget,
  QuickActionsWidget,
} from '../components/dashboard/widgets';
import { USER_ROLES } from '../utils/constants';

// Map widget types to components
const WIDGET_COMPONENTS = {
  [WIDGET_TYPES.TODAY_SCHEDULE]: TodayScheduleWidget,
  [WIDGET_TYPES.ACTIVE_TASKS]: ActiveTasksWidget,
  [WIDGET_TYPES.REMINDERS]: RemindersWidget,
  [WIDGET_TYPES.QUICK_STATS]: QuickStatsWidget,
  [WIDGET_TYPES.RECENT_MESSAGES]: RecentMessagesWidget,
  [WIDGET_TYPES.PENDING_LEAVES]: PendingLeavesWidget,
  [WIDGET_TYPES.UPCOMING_APPOINTMENTS]: UpcomingAppointmentsWidget,
  [WIDGET_TYPES.QUICK_ACTIONS]: QuickActionsWidget,
};

// Map icon names to components
const ICONS = {
  Calendar,
  ClipboardList,
  ListTodo,
  BarChart3,
  MessageSquare,
  Users,
  CalendarDays,
  Zap,
};

// Get time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Buna dimineata', icon: Sunrise };
  if (hour < 18) return { text: 'Buna ziua', icon: Sun };
  return { text: 'Buna seara', icon: Moon };
};

// Widget size classes
const SIZE_CLASSES = {
  small: 'col-span-1',
  medium: 'col-span-1 lg:col-span-1',
  large: 'col-span-1 lg:col-span-2',
  full: 'col-span-1 lg:col-span-3',
};

// Sortable widget wrapper
function SortableWidget({ widget, isEditMode, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = WIDGET_CONFIG[widget.id];
  const IconComponent = ICONS[config?.icon] || Calendar;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${SIZE_CLASSES[widget.size] || SIZE_CLASSES.medium} ${
        isEditMode ? 'ring-2 ring-dashed ring-gray-300 rounded-xl' : ''
      }`}
    >
      <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden h-full ${
        isDragging ? 'shadow-lg' : ''
      }`}>
        {/* Widget header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <IconComponent className="h-4 w-4 text-viperx-primary" />
            {config?.title || 'Widget'}
          </h3>
          {isEditMode && (
            <button
              {...attributes}
              {...listeners}
              className="p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
        {/* Widget content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Widget toggle button for edit mode
function WidgetToggle({ widgetId, visible, onToggle }) {
  const config = WIDGET_CONFIG[widgetId];
  const IconComponent = ICONS[config?.icon] || Calendar;

  return (
    <button
      onClick={() => onToggle(widgetId)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
        visible
          ? 'bg-viperx-primary/5 border-viperx-primary text-viperx-primary'
          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
      }`}
    >
      <IconComponent className="h-4 w-4" />
      <span className="text-sm font-medium">{config?.title}</span>
      {visible ? (
        <Eye className="h-3.5 w-3.5 ml-auto" />
      ) : (
        <EyeOff className="h-3.5 w-3.5 ml-auto" />
      )}
    </button>
  );
}

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(USER_ROLES.ADMIN);
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  const now = new Date();

  const {
    widgets,
    isEditMode,
    initializeWidgets,
    toggleEditMode,
    setEditMode,
    reorderWidgets,
    toggleWidgetVisibility,
    resetToDefaults,
  } = useDashboardStore();

  // Initialize widgets on mount
  useEffect(() => {
    initializeWidgets(isAdmin ? USER_ROLES.ADMIN : 'USER');
  }, [initializeWidgets, isAdmin]);

  // Filter visible widgets and check role permissions
  const visibleWidgets = useMemo(() => {
    return widgets.filter(w => {
      if (!w.visible) return false;
      const config = WIDGET_CONFIG[w.id];
      if (!config) return false;
      if (config.roles.includes('all')) return true;
      if (config.roles.includes('ADMIN') && isAdmin) return true;
      return false;
    });
  }, [widgets, isAdmin]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex(w => w.id === active.id);
      const newIndex = widgets.findIndex(w => w.id === over.id);
      reorderWidgets(arrayMove(widgets, oldIndex, newIndex));
    }
  };

  const handleReset = () => {
    resetToDefaults(isAdmin ? USER_ROLES.ADMIN : 'USER');
    setEditMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <GreetingIcon className="h-4 w-4" />
            <span>{greeting.text}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {format(now, "EEEE, d MMMM yyyy", { locale: roDateLocale })}
          </p>
        </div>

        <button
          onClick={toggleEditMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
            isEditMode
              ? 'bg-viperx-primary text-white border-viperx-primary'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isEditMode ? 'Gata' : 'Personalizeaza'}
          </span>
        </button>
      </div>

      {/* Edit mode panel */}
      {isEditMode && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Trage widget-urile pentru a le reordona sau activeaza/dezactiveaza:
            </p>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reseteaza
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {widgets.map(widget => {
              const config = WIDGET_CONFIG[widget.id];
              if (!config) return null;
              // Check role permission
              if (!config.roles.includes('all') && !config.roles.includes('ADMIN')) return null;
              if (config.roles.includes('ADMIN') && !isAdmin) return null;

              return (
                <WidgetToggle
                  key={widget.id}
                  widgetId={widget.id}
                  visible={widget.visible}
                  onToggle={toggleWidgetVisibility}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Quick stats (always at top, full width) */}
      {visibleWidgets.find(w => w.id === WIDGET_TYPES.QUICK_STATS) && (
        <QuickStatsWidget />
      )}

      {/* Widget grid with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.filter(w => w.id !== WIDGET_TYPES.QUICK_STATS).map(w => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {visibleWidgets
              .filter(w => w.id !== WIDGET_TYPES.QUICK_STATS)
              .map(widget => {
                const WidgetComponent = WIDGET_COMPONENTS[widget.id];
                if (!WidgetComponent) return null;

                return (
                  <SortableWidget
                    key={widget.id}
                    widget={widget}
                    isEditMode={isEditMode}
                  >
                    <WidgetComponent />
                  </SortableWidget>
                );
              })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {visibleWidgets.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Settings2 className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-900 mb-1">Niciun widget activ</p>
          <p className="text-sm text-gray-500 mb-4">
            Apasa pe "Personalizeaza" pentru a adauga widget-uri
          </p>
          <button
            onClick={toggleEditMode}
            className="inline-flex items-center gap-2 px-4 py-2 bg-viperx-primary text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition"
          >
            <Settings2 className="h-4 w-4" />
            Personalizeaza dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
