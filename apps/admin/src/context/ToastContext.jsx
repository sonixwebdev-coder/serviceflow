import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

let toastCounter = 0;

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const TYPE_CLASSES = {
  success: 'border-green-200 bg-green-50 text-green-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

const ICON_CLASSES = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(({ title, description, type = 'info', duration = 4000 } = {}) => {
    toastCounter += 1;
    const id = toastCounter;
    setToasts((current) => [
      ...current,
      { id, title, description, type },
    ]);

    if (duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      timers.current.set(id, timer);
    }
  }, [removeToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  const value = useMemo(() => ({ showToast, removeToast }), [removeToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || ICONS.info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto animate-slide-in-right rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm transition-all ${TYPE_CLASSES[toast.type] || TYPE_CLASSES.info}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_CLASSES[toast.type] || ICON_CLASSES.info}`} />
                <div className="flex-1 min-w-0">
                  {toast.title && (
                    <p className="text-sm font-semibold">{toast.title}</p>
                  )}
                  {toast.description && (
                    <p className="mt-0.5 text-[13px] opacity-80 whitespace-pre-line">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 rounded-md p-0.5 opacity-50 transition hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastContext;
