import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Circle, CheckCircle2, ChevronRight } from 'lucide-react';
import useTasks from '../../../hooks/useTasks';
import { TASK_STATUS } from '../../../utils/constants';

const STATUS_LABELS = {
  [TASK_STATUS.TODO]: 'De facut',
  [TASK_STATUS.IN_PROGRESS]: 'In lucru',
};

const ListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-sm bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

export default function ActiveTasksWidget() {
  const navigate = useNavigate();
  const { tasks, loading } = useTasks();

  const activeTasks = useMemo(() => {
    return tasks
      .filter(
        (task) => task.status !== TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.CANCELLED
      )
      .sort((a, b) => {
        if (a.status === TASK_STATUS.IN_PROGRESS && b.status !== TASK_STATUS.IN_PROGRESS) return -1;
        if (b.status === TASK_STATUS.IN_PROGRESS && a.status !== TASK_STATUS.IN_PROGRESS) return 1;
        return 0;
      })
      .slice(0, 5);
  }, [tasks]);

  if (loading) {
    return <ListSkeleton />;
  }

  if (activeTasks.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <p className="font-medium text-gray-900">Totul finalizat!</p>
        <p className="text-sm text-gray-500 mt-1">Nu ai task-uri active</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeTasks.map((task) => {
        const isInProgress = task.status === TASK_STATUS.IN_PROGRESS;
        return (
          <div
            key={task._id}
            onClick={() => navigate('/tasks')}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
          >
            <div
              className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                isInProgress ? 'bg-blue-100' : 'bg-gray-200'
              }`}
            >
              {isInProgress ? (
                <Play className="h-4 w-4 text-blue-600 fill-blue-600" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{task.title}</p>
              <p className="text-xs text-gray-500 capitalize">{task.taskType}</p>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isInProgress ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {STATUS_LABELS[task.status]}
            </span>
          </div>
        );
      })}

      <button
        onClick={() => navigate('/tasks')}
        className="w-full text-center text-sm text-primary hover:text-orange-600 font-medium py-2 flex items-center justify-center gap-1"
      >
        Toate task-urile <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
