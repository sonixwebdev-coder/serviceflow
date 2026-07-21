import { useNavigate } from 'react-router-dom';
import { format, parseISO, isToday, isPast } from 'date-fns';
import roDateLocale from 'date-fns/locale/ro';
import { ListTodo, ChevronRight } from 'lucide-react';
import { usePersonalTodos } from '../../../hooks/usePersonalTodos';

const ListSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
        <div className="w-1.5 h-8 animate-pulse rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1">
          <div className="h-4 w-32 animate-pulse rounded-sm bg-gray-200" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

export default function RemindersWidget() {
  const navigate = useNavigate();
  const { data: todos = [], isLoading } = usePersonalTodos({ isCompleted: false });

  const sortedTodos = [...todos]
    .sort((a, b) => {
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const aPriority = priorityOrder[a.priority?.toUpperCase()] ?? 4;
      const bPriority = priorityOrder[b.priority?.toUpperCase()] ?? 4;
      if (aPriority !== bPriority) return aPriority - bPriority;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      return 0;
    })
    .slice(0, 6);

  if (isLoading) {
    return <ListSkeleton />;
  }

  if (sortedTodos.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <ListTodo className="h-6 w-6 text-gray-400" />
        </div>
        <p className="font-medium text-gray-900">Niciun reminder</p>
        <p className="text-sm text-gray-500 mt-1">Lista ta este goala</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedTodos.map((todo) => {
        const priority = todo.priority?.toUpperCase();
        const isOverdue =
          todo.dueDate && isPast(parseISO(todo.dueDate)) && !isToday(parseISO(todo.dueDate));
        const isDueToday = todo.dueDate && isToday(parseISO(todo.dueDate));

        return (
          <div
            key={todo.id}
            onClick={() => navigate('/personal-todos')}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
              isOverdue
                ? 'bg-red-50 hover:bg-red-100'
                : isDueToday
                  ? 'bg-orange-50 hover:bg-orange-100'
                  : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <div
              className={`w-1.5 h-8 rounded-full shrink-0 ${
                isOverdue
                  ? 'bg-red-500'
                  : priority === 'URGENT'
                    ? 'bg-orange-500'
                    : priority === 'HIGH'
                      ? 'bg-yellow-500'
                      : 'bg-gray-300'
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{todo.title}</p>
              {todo.dueDate && (
                <p
                  className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}
                >
                  {isOverdue
                    ? 'Intarziat'
                    : isDueToday
                      ? 'Astazi'
                      : format(parseISO(todo.dueDate), 'dd MMM', { locale: roDateLocale })}
                </p>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => navigate('/personal-todos')}
        className="w-full text-center text-sm text-primary hover:text-orange-600 font-medium py-2 flex items-center justify-center gap-1"
      >
        Vezi toate <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
