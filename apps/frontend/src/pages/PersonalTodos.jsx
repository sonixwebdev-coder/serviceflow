import { useState, useMemo, useEffect } from 'react';
import { format, parseISO, differenceInDays, isToday, isPast } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  Plus,
  X,
  Edit,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  ListTodo,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  usePersonalTodos,
  useCreatePersonalTodo,
  useUpdatePersonalTodo,
  useDeletePersonalTodo,
  useTogglePersonalTodo,
} from '../hooks/usePersonalTodos';
import useToast from '../context/useToast';

// Priority constants
const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

const PRIORITY_META = {
  // Uppercase format (legacy)
  [PRIORITY.LOW]: { label: 'Scazuta', class: 'bg-gray-100 text-gray-700 border-gray-300' },
  [PRIORITY.MEDIUM]: { label: 'Medie', class: 'bg-blue-100 text-blue-700 border-blue-300' },
  [PRIORITY.HIGH]: { label: 'Ridicata', class: 'bg-orange-100 text-orange-700 border-orange-300' },
  [PRIORITY.URGENT]: { label: 'Urgenta', class: 'bg-red-100 text-red-700 border-red-300' },
  // Lowercase format (new backend format)
  low: { label: 'Scazuta', class: 'bg-gray-100 text-gray-700 border-gray-300' },
  medium: { label: 'Medie', class: 'bg-blue-100 text-blue-700 border-blue-300' },
  high: { label: 'Ridicata', class: 'bg-orange-100 text-orange-700 border-orange-300' },
  urgent: { label: 'Urgenta', class: 'bg-red-100 text-red-700 border-red-300' },
};

// Helper function to safely get priority metadata
const getPriorityMeta = (priority) => {
  if (!priority) return PRIORITY_META[PRIORITY.MEDIUM]; // Default fallback
  return (
    PRIORITY_META[priority] ||
    PRIORITY_META[priority.toUpperCase()] ||
    PRIORITY_META[PRIORITY.MEDIUM]
  );
};

const defaultTodoForm = {
  title: '',
  description: '',
  priority: PRIORITY.MEDIUM,
  dueDate: null,
};

/**
 * Get due date status and styling
 * @param {string} dueDate - ISO date string
 * @param {boolean} isCompleted - Whether todo is completed
 * @returns {Object} Status info with icon, class, and label
 */
const getDueDateStatus = (dueDate, isCompleted) => {
  if (!dueDate || isCompleted) return null;

  const date = parseISO(dueDate);
  const now = new Date();
  const daysDiff = differenceInDays(date, now);

  if (isPast(date) && !isToday(date)) {
    return {
      icon: AlertCircle,
      class: 'bg-red-50 text-red-700 border-red-200',
      label: 'Intarziat',
    };
  }

  if (isToday(date)) {
    return {
      icon: Clock,
      class: 'bg-orange-50 text-orange-700 border-orange-200',
      label: 'Astazi',
    };
  }

  if (daysDiff <= 3) {
    return {
      icon: Calendar,
      class: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      label: `In ${daysDiff} zile`,
    };
  }

  return {
    icon: Calendar,
    class: 'text-gray-600',
    label: format(date, 'dd MMM yyyy', { locale: roDateLocale }),
  };
};

/**
 * Format due date for display
 * @param {string} dueDate - ISO date string
 * @returns {string} Formatted date
 */
const formatDueDate = (dueDate) => {
  if (!dueDate) return '';
  try {
    const date = parseISO(dueDate);
    return format(date, 'dd MMM yyyy, HH:mm', { locale: roDateLocale });
  } catch {
    return '';
  }
};

const PersonalTodos = () => {
  const { showToast } = useToast();

  // Filters state
  const [completionFilter, setCompletionFilter] = useState('all'); // 'all', 'active', 'completed'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
  const [sortBy, setSortBy] = useState('dueDate'); // 'dueDate', 'priority', 'createdAt'

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [todoForm, setTodoForm] = useState(defaultTodoForm);
  const [todoFormError, setTodoFormError] = useState('');

  // Delete confirmation
  const [deletingTodoId, setDeletingTodoId] = useState(null);
  // Toggle loading per todo
  const [togglingTodoId, setTogglingTodoId] = useState(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          closeModal();
        } else if (deletingTodoId) {
          cancelDelete();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen, deletingTodoId]);

  // Build filters for API
  const apiFilters = useMemo(() => {
    const filters = {};
    if (completionFilter === 'active') filters.isCompleted = false;
    if (completionFilter === 'completed') filters.isCompleted = true;
    if (priorityFilter !== 'all') filters.priority = priorityFilter;
    return filters;
  }, [completionFilter, priorityFilter]);

  // Fetch todos
  const { data: todos = [], isLoading, error } = usePersonalTodos(apiFilters);

  // Mutations
  const createMutation = useCreatePersonalTodo();
  const updateMutation = useUpdatePersonalTodo();
  const deleteMutation = useDeletePersonalTodo();
  const toggleMutation = useTogglePersonalTodo();

  // Sort todos
  const sortedTodos = useMemo(() => {
    if (!todos.length) return [];

    const sorted = [...todos];

    switch (sortBy) {
      case 'dueDate':
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        break;
      case 'priority': {
        const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      }
      case 'createdAt':
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      default:
        break;
    }

    return sorted;
  }, [todos, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = todos.length;
    const active = todos.filter((t) => !t.isCompleted).length;
    const completed = todos.filter((t) => t.isCompleted).length;
    const overdue = todos.filter(
      (t) =>
        !t.isCompleted && t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))
    ).length;

    return { total, active, completed, overdue };
  }, [todos]);

  // Form handlers
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setTodoForm((current) => ({ ...current, [name]: value }));
  };

  const handleDueDateChange = (date) => {
    setTodoForm((current) => ({ ...current, dueDate: date }));
  };

  const openCreateModal = () => {
    setEditingTodo(null);
    setTodoForm(defaultTodoForm);
    setTodoFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (todo) => {
    setEditingTodo(todo);
    setTodoForm({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority,
      dueDate: todo.dueDate ? parseISO(todo.dueDate) : null,
    });
    setTodoFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTodo(null);
    setTodoForm(defaultTodoForm);
    setTodoFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!todoForm.title.trim()) {
      setTodoFormError('Titlul este obligatoriu');
      return;
    }

    if (todoForm.title.length > 200) {
      setTodoFormError('Titlul nu poate depasi 200 de caractere');
      return;
    }

    if (todoForm.description.length > 1000) {
      setTodoFormError('Descrierea nu poate depasi 1000 de caractere');
      return;
    }

    setTodoFormError('');

    const payload = {
      title: todoForm.title.trim(),
      description: todoForm.description.trim(),
      priority: todoForm.priority,
    };

    // Include dueDate if set
    if (todoForm.dueDate) {
      payload.dueDate = todoForm.dueDate.toISOString();
    }

    try {
      if (editingTodo) {
        // Use id or _id, whichever is available
        const todoId = editingTodo.id || editingTodo._id;
        if (!todoId) {
          throw new Error('Invalid todo ID');
        }
        await updateMutation.mutateAsync({ todoId, payload });
        showToast({
          title: 'Todo actualizat',
          description: 'Todo-ul a fost actualizat cu succes.',
          type: 'success',
        });
      } else {
        await createMutation.mutateAsync(payload);
        showToast({
          title: 'Todo creat',
          description: 'Todo-ul a fost adaugat cu succes.',
          type: 'success',
        });
      }
      closeModal();
    } catch (err) {
      setTodoFormError(err.message || 'A aparut o eroare');
      showToast({
        title: 'Eroare',
        description: err.message || 'Nu s-a putut salva todo-ul.',
        type: 'error',
      });
    }
  };

  const handleToggleComplete = async (todo) => {
    setTogglingTodoId(todo.id);
    try {
      await toggleMutation.mutateAsync({
        todoId: todo.id,
        isCompleted: !todo.isCompleted,
      });
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-a putut actualiza statusul.',
        type: 'error',
      });
    } finally {
      setTogglingTodoId(null);
    }
  };

  const handleDelete = async (todoId) => {
    setDeletingTodoId(todoId);
  };

  const confirmDelete = async () => {
    if (!deletingTodoId) return;

    try {
      await deleteMutation.mutateAsync(deletingTodoId);
      showToast({
        title: 'Todo sters',
        description: 'Todo-ul a fost sters cu succes.',
        type: 'success',
      });
      setDeletingTodoId(null);
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-a putut sterge todo-ul.',
        type: 'error',
      });
    }
  };

  const cancelDelete = () => {
    setDeletingTodoId(null);
  };

  const handleClearCompleted = async () => {
    const completedTodos = todos.filter((t) => t.isCompleted);
    if (completedTodos.length === 0) return;

    try {
      await Promise.all(completedTodos.map((t) => deleteMutation.mutateAsync(t.id)));
      showToast({
        title: 'Todos sterse',
        description: `${completedTodos.length} todo-uri finalizate au fost sterse.`,
        type: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Eroare',
        description: 'Nu s-au putut sterge toate todo-urile.',
        type: 'error',
      });
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm text-red-600">Eroare la incarcarea todo-urilor: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todo-uri Personale</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestioneaza-ti task-urile si reminder-urile personale
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          <Plus size={18} />
          Adauga Todo
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Total</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Active</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.active}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Finalizate</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Intarziate</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">Filtre</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Completion filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">Toate</option>
              <option value="active">Active</option>
              <option value="completed">Finalizate</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioritate</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">Toate</option>
              <option value={PRIORITY.LOW}>Scazuta</option>
              <option value={PRIORITY.MEDIUM}>Medie</option>
              <option value={PRIORITY.HIGH}>Ridicata</option>
              <option value={PRIORITY.URGENT}>Urgenta</option>
            </select>
          </div>

          {/* Sort by */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sorteaza dupa</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="dueDate">Data scadenta</option>
              <option value="priority">Prioritate</option>
              <option value="createdAt">Data crearii</option>
            </select>
          </div>
        </div>

        {/* Clear completed button */}
        {stats.completed > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleClearCompleted}
              className="text-sm font-medium text-red-600 transition hover:text-red-700"
            >
              Sterge toate finalizate ({stats.completed})
            </button>
          </div>
        )}
      </div>

      {/* Todos list */}
      {sortedTodos.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <ListTodo size={48} className="mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {completionFilter === 'completed'
              ? 'Nicio todo finalizata'
              : completionFilter === 'active'
                ? 'Felicitari! Nicio todo activa'
                : 'Nicio todo momentan'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {completionFilter === 'active'
              ? 'Ai finalizat toate task-urile! Ia o pauza bine meritata.'
              : 'Incepe prin a adauga primul tau todo.'}
          </p>
          {completionFilter === 'all' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              <Plus size={18} />
              Adauga primul todo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTodos.map((todo) => {
            const dueDateStatus = getDueDateStatus(todo.dueDate, todo.isCompleted);
            const priorityMeta = getPriorityMeta(todo.priority);

            return (
              <div
                key={todo.id}
                className={`rounded-lg border bg-white p-4 transition ${
                  todo.isCompleted
                    ? 'border-gray-200 opacity-60'
                    : 'border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(todo)}
                    className="mt-1 shrink-0 relative"
                    disabled={togglingTodoId === todo.id}
                  >
                    {togglingTodoId === todo.id ? (
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    ) : todo.isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-sm border-2 border-gray-400 hover:border-primary transition" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3
                          className={`text-base font-semibold ${
                            todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <p
                            className={`mt-1 text-sm ${
                              todo.isCompleted ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            {todo.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {!todo.isCompleted && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(todo)}
                            disabled={togglingTodoId === todo.id}
                            className="rounded-sm p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(todo.id)}
                            disabled={togglingTodoId === todo.id}
                            className="rounded-sm p-1.5 text-gray-500 transition hover:bg-red-100 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {/* Priority badge */}
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityMeta.class}`}
                      >
                        {priorityMeta.label}
                      </span>

                      {/* Due date */}
                      {dueDateStatus && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${dueDateStatus.class}`}
                        >
                          <dueDateStatus.icon size={12} />
                          {dueDateStatus.label}
                        </span>
                      )}

                      {/* Completed at */}
                      {todo.isCompleted && todo.completedAt && (
                        <span className="text-xs text-gray-500">
                          Finalizat: {formatDueDate(todo.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ margin: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTodo ? 'Editeaza Todo' : 'Adauga Todo'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titlu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={todoForm.title}
                  onChange={handleFormChange}
                  maxLength={200}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Pregateste raportul zilnic"
                />
                <p className="mt-1 text-xs text-gray-500">{todoForm.title.length}/200 caractere</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descriere (optional)
                </label>
                <textarea
                  name="description"
                  value={todoForm.description}
                  onChange={handleFormChange}
                  maxLength={1000}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="Detalii suplimentare..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {todoForm.description.length}/1000 caractere
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioritate</label>
                <select
                  name="priority"
                  value={todoForm.priority}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value={PRIORITY.LOW}>Scazuta</option>
                  <option value={PRIORITY.MEDIUM}>Medie</option>
                  <option value={PRIORITY.HIGH}>Ridicata</option>
                  <option value={PRIORITY.URGENT}>Urgenta</option>
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data scadenta (optional)
                </label>
                <ReactDatePicker
                  selected={todoForm.dueDate}
                  onChange={handleDueDateChange}
                  showTimeSelect
                  dateFormat="dd/MM/yyyy HH:mm"
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  placeholderText="Selecteaza data si ora"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  wrapperClassName="w-full"
                  locale={roDateLocale}
                />
                {todoForm.dueDate && isPast(todoForm.dueDate) && !isToday(todoForm.dueDate) && (
                  <p className="mt-1 text-xs text-orange-600">
                    Atentie: Data selectata este in trecut
                  </p>
                )}
              </div>

              {/* Error message */}
              {todoFormError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-600">{todoFormError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anuleaza
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Se salveaza...'
                    : editingTodo
                      ? 'Actualizeaza'
                      : 'Adauga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTodoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelDelete();
            }
          }}
        >
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Confirma stergerea</h2>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Esti sigur ca vrei sa stergi acest todo? Aceasta actiune nu poate fi anulata.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anuleaza
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {deleteMutation.isPending ? 'Se sterge...' : 'Sterge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalTodos;
