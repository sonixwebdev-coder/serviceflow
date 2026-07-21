import { useEffect, useMemo, useState } from 'react';
import confirm from '../utils/confirm';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import {
  Plus,
  X,
  Calendar as CalendarIcon,
  User,
  MessageSquare,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import useTasks from '../hooks/useTasks';
import useUsers from '../hooks/useUsers';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';
import { USER_ROLES, TASK_STATUS, TASK_PRIORITY } from '../utils/constants';
import {
  createTask,
  updateTask,
  addTaskComment,
  deleteTask,
  fetchTaskComments,
} from '../services/taskService';
import DatePicker from '../components/ui/DatePicker';
import Pagination from '../components/Pagination';
import LocationBadge from '../components/LocationBadge';

const TASK_TYPE_LABELS = {
  installation: 'Instalare',
  repair: 'Reparatie',
  inventory: 'Inventar',
  maintenance: 'Mentenanta',
  custom: 'Personalizat',
  other: 'Altele',
};

const STATUS_META = {
  [TASK_STATUS.TODO]: {
    label: 'De facut',
    icon: Clock,
    class: 'bg-gray-50 text-gray-800 border-gray-200',
  },
  [TASK_STATUS.IN_PROGRESS]: {
    label: 'In lucru',
    icon: AlertCircle,
    class: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  [TASK_STATUS.COMPLETED]: {
    label: 'Finalizat',
    icon: CheckCircle2,
    class: 'bg-green-50 text-green-800 border-green-200',
  },
};

const PRIORITY_META = {
  [TASK_PRIORITY.LOW]: { label: 'Scazuta', class: 'bg-gray-50 text-gray-700 border-gray-200' },
  [TASK_PRIORITY.MEDIUM]: {
    label: 'Medie',
    class: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  [TASK_PRIORITY.HIGH]: {
    label: 'Ridicata',
    class: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  [TASK_PRIORITY.URGENT]: { label: 'Urgenta', class: 'bg-red-50 text-red-800 border-red-200' },
};

const defaultTaskForm = {
  title: '',
  description: '',
  taskType: 'installation',
  priority: TASK_PRIORITY.MEDIUM,
  dueDate: null,
  assignedTo: [],
};

const Tasks = () => {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();
  const userId = user?._id || user?.id || '';
  const isManagerial = hasRole(USER_ROLES.ADMIN);

  const { tasks, meta, loading, error, setPage, refresh } = useTasks(
    {},
    { enablePagination: true }
  );
  // All users (including non-admins) should see all employees when creating/assigning tasks
  const { users: employees = [] } = useUsers({ isActive: true }, { enabled: true });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [taskFormError, setTaskFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [commentMap, setCommentMap] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const [optimisticComments, setOptimisticComments] = useState({});
  const [loadedComments, setLoadedComments] = useState({}); // Store lazy-loaded comments
  const [commentCountOverrides, setCommentCountOverrides] = useState({}); // Track updated counts

  const [statusOverrides, setStatusOverrides] = useState({});

  const [hiddenTasks, setHiddenTasks] = useState({});

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) => updateTask(taskId, { status }),
    onSuccess: () => refresh(),
    onSettled: (_data, _error, { taskId }) => {
      setStatusOverrides((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => refresh(),
    onError: (_error, taskId) => {
      setHiddenTasks((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    },
  });

  const [expandedTasks, setExpandedTasks] = useState({});

  const statusOptions = useMemo(() => Object.values(TASK_STATUS), []);
  const priorityOptions = useMemo(() => Object.values(TASK_PRIORITY), []);
  const visibleTasks = useMemo(
    () => tasks.filter((task) => !hiddenTasks[task._id]),
    [hiddenTasks, tasks]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setTaskForm((current) => ({ ...current, [name]: value }));
  };

  const handleDueDateChange = (date) => {
    setTaskForm((current) => ({ ...current, dueDate: date }));
  };

  const handleAssigneeToggle = (selectedUserId) => {
    setTaskForm((current) => {
      const isSelected = current.assignedTo.includes(selectedUserId);
      return {
        ...current,
        assignedTo: isSelected
          ? current.assignedTo.filter((id) => id !== selectedUserId)
          : [...current.assignedTo, selectedUserId],
      };
    });
  };

  const openModal = () => {
    setTaskForm(defaultTaskForm);
    setTaskFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTaskForm(defaultTaskForm);
    setTaskFormError('');
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      setTaskFormError('Titlul este obligatoriu');
      return;
    }

    setTaskFormError('');
    setSubmitting(true);

    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        taskType: taskForm.taskType,
        priority: taskForm.priority,
        assignedTo: taskForm.assignedTo,
      };

      // Only include dueDate if it's set
      if (taskForm.dueDate) {
        payload.dueDate = format(taskForm.dueDate, 'yyyy-MM-dd');
      }

      await createTask(payload);
      await refresh();
      closeModal();
      showToast({
        title: 'Task creat',
        description: 'Task-ul a fost adaugat cu succes.',
        type: 'success',
      });
    } catch (creationError) {
      setTaskFormError(creationError.message || 'Nu s-a putut crea task-ul');
      showToast({
        title: 'Creare esuata',
        description: creationError.message || 'Nu s-a putut crea task-ul.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canModifyTask = (task) => {
    if (isManagerial) return true;

    const assignedIds =
      task.assignedTo?.map((assignee) =>
        typeof assignee === 'string' ? assignee : assignee._id || assignee
      ) || [];

    const creatorId =
      typeof task.createdBy === 'string' ? task.createdBy : task.createdBy?._id || '';

    return assignedIds.includes(userId) || creatorId.toString() === userId;
  };

  const handleStatusChange = (taskId, status) => {
    const currentTask = tasks.find((task) => task._id === taskId);
    if (!currentTask) return;

    setStatusOverrides((prev) => ({ ...prev, [taskId]: status }));
    statusMutation.mutate(
      { taskId, status },
      {
        onSuccess: () => {
          showToast({
            title: 'Task actualizat',
            description: 'Status-ul a fost actualizat.',
            type: 'success',
          });
        },
        onError: (err) => {
          showToast({
            title: 'Actualizare esuata',
            description: err.message || 'Nu s-a putut actualiza status-ul.',
            type: 'error',
          });
        },
      }
    );
  };

  const handleAddComment = async (taskId) => {
    const text = (commentMap[taskId] || '').trim();
    if (!text) return;

    const tempId = `optimistic-${Date.now()}`;
    const optimisticEntry = {
      _id: tempId,
      text,
      createdAt: new Date().toISOString(),
      user: {
        firstName: user?.firstName || 'Tu',
        lastName: user?.lastName || '',
      },
      optimistic: true,
    };

    setCommentLoading((prev) => ({ ...prev, [taskId]: true }));
    setOptimisticComments((prev) => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), optimisticEntry],
    }));
    setCommentMap((prev) => ({ ...prev, [taskId]: '' }));

    try {
      await addTaskComment(taskId, { text });
      // Reload comments for this task and update count
      const updatedComments = await fetchTaskComments(taskId);

      // Update loaded comments and count BEFORE clearing optimistic
      setLoadedComments((prev) => ({ ...prev, [taskId]: updatedComments }));
      setCommentCountOverrides((prev) => ({ ...prev, [taskId]: updatedComments.length }));

      // Clear optimistic comment after real comments are loaded
      setOptimisticComments((prev) => {
        const comments = prev[taskId] || [];
        const filtered = comments.filter((comment) => comment._id !== tempId);
        if (filtered.length === 0) {
          const next = { ...prev };
          delete next[taskId];
          return next;
        }
        return {
          ...prev,
          [taskId]: filtered,
        };
      });

      setCommentLoading((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });

      showToast({
        title: 'Comentariu adaugat',
        description: 'Comentariul tau a fost postat.',
        type: 'success',
      });
    } catch (commentError) {
      // Remove optimistic comment on error
      setOptimisticComments((prev) => {
        const comments = prev[taskId] || [];
        const filtered = comments.filter((comment) => comment._id !== tempId);
        if (filtered.length === 0) {
          const next = { ...prev };
          delete next[taskId];
          return next;
        }
        return {
          ...prev,
          [taskId]: filtered,
        };
      });

      setCommentLoading((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });

      showToast({
        title: 'Comentariu esuat',
        description: commentError.message || 'Te rugam sa incerci din nou.',
        type: 'error',
      });
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (
      !(await confirm({
        title: 'Sterge task',
        text: 'Esti sigur ca vrei sa stergi acest task?',
        confirmText: 'Sterge',
        danger: true,
      }))
    ) {
      return;
    }

    setHiddenTasks((prev) => ({ ...prev, [taskId]: true }));
    deleteMutation.mutate(taskId, {
      onSuccess: () => {
        showToast({
          title: 'Task sters',
          description: 'Task-ul a fost sters cu succes.',
          type: 'success',
        });
      },
      onError: (err) => {
        showToast({
          title: 'Stergere esuata',
          description: err.message || 'Te rugam sa incerci din nou.',
          type: 'error',
        });
      },
    });
  };

  const toggleTaskExpansion = async (taskId) => {
    const isCurrentlyExpanded = expandedTasks[taskId];

    // Toggle expansion
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));

    // If expanding and comments not loaded yet, fetch them
    if (!isCurrentlyExpanded && !loadedComments[taskId]) {
      try {
        setCommentLoading((prev) => ({ ...prev, [taskId]: true }));
        const comments = await fetchTaskComments(taskId);
        setLoadedComments((prev) => ({ ...prev, [taskId]: comments }));
        setCommentCountOverrides((prev) => ({ ...prev, [taskId]: comments.length }));
      } catch (error) {
        console.error('Failed to load comments:', error);
        showToast({
          type: 'error',
          title: 'Eroare',
          description: 'Nu s-au putut incarca comentariile.',
        });
      } finally {
        setCommentLoading((prev) => ({ ...prev, [taskId]: false }));
      }
    }
  };

  // Refresh loaded comments when tasks update (from socket events)
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    // Check if any expanded tasks have a comment count that differs from our override
    Object.keys(expandedTasks).forEach(async (taskId) => {
      if (!expandedTasks[taskId]) return; // Skip if not expanded

      const task = tasks.find((t) => t._id === taskId);
      if (!task) return;

      const currentOverride = commentCountOverrides[taskId];
      const backendCount = task.commentCount;

      // If backend count differs from our override, refresh the comments
      if (
        backendCount !== undefined &&
        currentOverride !== undefined &&
        backendCount !== currentOverride
      ) {
        try {
          const updatedComments = await fetchTaskComments(taskId);
          setLoadedComments((prev) => ({ ...prev, [taskId]: updatedComments }));
          setCommentCountOverrides((prev) => ({ ...prev, [taskId]: updatedComments.length }));
        } catch (error) {
          console.error('Failed to refresh comments:', error);
        }
      }
    });
  }, [tasks, expandedTasks, commentCountOverrides]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isModalOpen]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Task-uri</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestioneaza si urmareste task-urile echipei tale.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          <Plus size={18} />
          Task nou
        </button>
      </div>

      {/* Task Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-white border border-red-200 p-6 text-center text-sm text-red-600">
            {error}
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-6 text-center text-sm text-gray-500">
            Niciun task inca.
          </div>
        ) : (
          visibleTasks.map((task) => {
            const canEdit = canModifyTask(task);
            const assigned = task.assignedTo || [];
            const displayStatus = statusOverrides[task._id] ?? task.status;
            const combinedComments = [
              ...(loadedComments[task._id] || []),
              ...(optimisticComments[task._id] || []),
            ];
            // Use override if available, otherwise calculate from task data
            const baseCount = commentCountOverrides[task._id] ?? task.commentCount ?? 0;
            const totalCommentCount = baseCount + (optimisticComments[task._id]?.length || 0);
            const isExpanded = expandedTasks[task._id];
            const statusMeta = STATUS_META[displayStatus];
            const StatusIcon = statusMeta?.icon;
            const priorityMeta = PRIORITY_META[task.priority];

            return (
              <div
                key={task._id}
                className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden"
              >
                {/* Task Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusMeta?.class || ''}`}
                        >
                          {StatusIcon && <StatusIcon size={12} />}
                          {statusMeta?.label || displayStatus}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityMeta?.class || ''}`}
                        >
                          {priorityMeta?.label || task.priority}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                          {TASK_TYPE_LABELS[task.taskType] || task.taskType}
                        </span>
                        <LocationBadge locationId={task.locationId} size="xs" />
                      </div>
                    </div>
                    {isManagerial && canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task._id)}
                        disabled={deleteMutation.isPending && deleteMutation.variables === task._id}
                        className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Sterge task"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon size={14} className="text-gray-400" />
                        <span>
                          Scadenta:{' '}
                          {format(new Date(task.dueDate), 'dd MMM yyyy', { locale: roDateLocale })}
                        </span>
                      </div>
                    )}
                    {assigned.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-gray-400" />
                        <span>
                          {assigned
                            .map((assignee) => {
                              const person =
                                typeof assignee === 'string'
                                  ? employees.find((emp) => emp._id === assignee)
                                  : assignee;
                              return person ? `${person.firstName} ${person.lastName}` : '';
                            })
                            .filter(Boolean)
                            .join(', ') || 'Nealocate'}
                        </span>
                      </div>
                    )}
                    {totalCommentCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-gray-400" />
                        <span>
                          {totalCommentCount}{' '}
                          {totalCommentCount === 1 ? 'comentariu' : 'comentarii'}
                        </span>
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Actualizeaza status
                      </label>
                      <select
                        value={displayStatus}
                        onChange={(event) => handleStatusChange(task._id, event.target.value)}
                        disabled={
                          statusMutation.isPending && statusMutation.variables?.taskId === task._id
                        }
                        className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {statusOptions.map((status) => {
                          const meta = STATUS_META[status];
                          return (
                            <option key={status} value={status}>
                              {meta?.label || status}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                {(canEdit || combinedComments.length > 0) && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <button
                      type="button"
                      onClick={() => toggleTaskExpansion(task._id)}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition mb-4"
                    >
                      <MessageSquare size={16} />
                      <span>
                        {isExpanded ? 'Ascunde' : 'Arata'} comentarii ({totalCommentCount})
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="space-y-4">
                        {commentLoading[task._id] && !loadedComments[task._id] ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">Se incarca comentariile...</p>
                          </div>
                        ) : combinedComments.length > 0 ? (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {combinedComments.map((comment) => (
                              <div
                                key={comment._id}
                                className={`rounded-lg bg-white border border-gray-200 p-3 ${comment.optimistic ? 'opacity-70' : ''}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {comment.user?.firstName} {comment.user?.lastName}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {comment.createdAt
                                      ? format(new Date(comment.createdAt), 'dd MMM HH:mm', {
                                          locale: roDateLocale,
                                        })
                                      : ''}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700">{comment.text}</p>
                                {comment.optimistic && (
                                  <p className="text-xs text-gray-400 mt-1">Se trimite...</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            Niciun comentariu inca.
                          </p>
                        )}

                        {canEdit && (
                          <div className="flex gap-2">
                            <textarea
                              value={commentMap[task._id] || ''}
                              onChange={(event) =>
                                setCommentMap((current) => ({
                                  ...current,
                                  [task._id]: event.target.value,
                                }))
                              }
                              placeholder="Adauga un comentariu..."
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                              rows={2}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(task._id)}
                              disabled={
                                commentLoading[task._id] || !(commentMap[task._id] || '').trim()
                              }
                              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition self-stretch"
                            >
                              {commentLoading[task._id] ? 'Se trimite...' : 'Posteaza'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
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

      {/* Create Task Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ margin: 0 }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
            style={{ margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Task nou</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 p-1.5 sm:p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="px-4 sm:px-6 py-3 sm:py-4 space-y-4">
              {taskFormError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {taskFormError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titlu *</label>
                <input
                  type="text"
                  name="title"
                  value={taskForm.title}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="Introduceti titlul task-ului..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
                <textarea
                  name="description"
                  value={taskForm.description}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Detalii despre task..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tip task</label>
                  <select
                    name="taskType"
                    value={taskForm.taskType}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioritate</label>
                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    {priorityOptions.map((priority) => {
                      const meta = PRIORITY_META[priority];
                      return (
                        <option key={priority} value={priority}>
                          {meta?.label || priority}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <DatePicker
                    label="Data scadenta"
                    value={taskForm.dueDate}
                    onChange={handleDueDateChange}
                    placeholder="Optional"
                    minDate={new Date()}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asigneaza persoane
                </label>
                <div className="flex flex-wrap gap-2">
                  {employees.map((employee) => {
                    const checked = taskForm.assignedTo.includes(employee._id);
                    return (
                      <label
                        key={employee._id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                          checked
                            ? 'border-primary bg-orange-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleAssigneeToggle(employee._id)}
                          className="rounded-sm border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>
                          {employee.firstName} {employee.lastName}
                        </span>
                      </label>
                    );
                  })}
                </div>
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
                  {submitting ? 'Se creaza...' : 'Creaza task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
